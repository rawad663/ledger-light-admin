import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/generated/client';
import { type CurrentOrg } from '@src/common/decorators/current-org.decorator';
import {
  getLocationScopeWhere,
  hasRestrictedLocations,
  resolveOrganizationScope,
} from '@src/common/organization/location-scope';
import { PrismaService } from '@src/infra/prisma/prisma.service';
import {
  CreateLocationDto,
  GetLocationsQueryDto,
  GetLocationsResponseDto,
  LocationStatus,
  UpdateLocationDto,
} from './location.dto';

@Injectable()
export class LocationService {
  constructor(private readonly prismaService: PrismaService) {}

  async getLocations(
    organization: CurrentOrg | string,
    query: GetLocationsQueryDto,
  ): Promise<GetLocationsResponseDto> {
    const org = resolveOrganizationScope(organization);
    const { search, status, type, ...paginationQuery } = query;

    const where: Prisma.LocationWhereInput = {
      organizationId: org.organizationId,
      ...getLocationScopeWhere(org, 'id'),
      ...(status ? { status } : { status: { not: LocationStatus.ARCHIVED } }),
      ...(type ? { type } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { addressLine1: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const {
      data: rawLocations,
      total,
      nextCursor,
    } = await this.prismaService.paginateMany(
      this.prismaService.location,
      {
        where,
        include: {
          inventoryLevels: {
            select: { quantity: true },
          },
        },
      },
      {
        ...paginationQuery,
        orderBy: query.sortBy
          ? { [query.sortBy]: query.sortOrder || 'desc' }
          : { updatedAt: 'desc' },
      },
    );

    const locations = rawLocations as Prisma.LocationGetPayload<{
      include: {
        inventoryLevels: {
          select: { quantity: true };
        };
      };
    }>[];

    return {
      data: locations.map((location) => ({
        ...location,
        onHandQuantity: location.inventoryLevels.reduce(
          (sum: number, inventoryLevel: { quantity: number }) =>
            sum + inventoryLevel.quantity,
          0,
        ),
      })),
      totalCount: total,
      nextCursor,
    };
  }

  async getLocationById(organization: CurrentOrg | string, locationId: string) {
    const org = resolveOrganizationScope(organization);
    const location = await this.prismaService.location.findFirst({
      where: {
        organizationId: org.organizationId,
        ...(hasRestrictedLocations(org)
          ? {
              AND: [{ id: locationId }, getLocationScopeWhere(org, 'id')],
            }
          : { id: locationId }),
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async createLocation(
    organization: CurrentOrg | string,
    locationData: CreateLocationDto,
  ) {
    const org = resolveOrganizationScope(organization);
    if (!org.hasAllLocations) {
      throw new ForbiddenException(
        'Only memberships with all-location access can create locations',
      );
    }

    return this.prismaService.location.create({
      data: {
        ...locationData,
        organizationId: org.organizationId,
      },
    });
  }

  async updateLocation(
    organization: CurrentOrg | string,
    locationId: string,
    locationData: UpdateLocationDto,
  ) {
    const org = resolveOrganizationScope(organization);
    const existing = await this.prismaService.location.findFirst({
      where: {
        organizationId: org.organizationId,
        ...(hasRestrictedLocations(org)
          ? {
              AND: [{ id: locationId }, getLocationScopeWhere(org, 'id')],
            }
          : { id: locationId }),
      },
    });

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    if (locationData.status === LocationStatus.ARCHIVED) {
      await this.assertNoInventoryOnHand(locationId, {
        message: 'Cannot archive a location with inventory on hand',
        errorType: 'bad-request',
      });
    }

    return this.prismaService.location.update({
      where: { id: locationId, organizationId: org.organizationId },
      data: locationData,
    });
  }

  async deleteLocation(organization: CurrentOrg | string, locationId: string) {
    const org = resolveOrganizationScope(organization);
    const existing = await this.prismaService.location.findFirst({
      where: {
        organizationId: org.organizationId,
        ...(hasRestrictedLocations(org)
          ? {
              AND: [{ id: locationId }, getLocationScopeWhere(org, 'id')],
            }
          : { id: locationId }),
      },
    });

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    const locationCount = await this.prismaService.location.count({
      where: {
        organizationId: org.organizationId,
        ...getLocationScopeWhere(org, 'id'),
      },
    });

    if (locationCount <= 1) {
      throw new ConflictException(
        'Cannot delete the only location in an organization',
      );
    }

    await this.assertNoInventoryOnHand(locationId, {
      message: 'Cannot delete a location with inventory on hand',
      errorType: 'conflict',
    });

    await this.assertNoLocationHistory(org.organizationId, locationId);

    return this.prismaService.location.delete({
      where: { id: locationId, organizationId: org.organizationId },
    });
  }

  private async assertNoLocationHistory(
    organizationId: string,
    locationId: string,
  ) {
    const orderCount = await this.prismaService.order.count({
      where: {
        organizationId,
        locationId,
      },
    });

    if (orderCount > 0) {
      throw new ConflictException(
        'Cannot delete a location with order history',
      );
    }
  }

  private async assertNoInventoryOnHand(
    locationId: string,
    options: { message: string; errorType: 'bad-request' | 'conflict' },
  ) {
    const inventoryOnHand = await this.prismaService.inventoryLevel.count({
      where: {
        locationId,
        quantity: { gt: 0 },
      },
    });

    if (inventoryOnHand === 0) {
      return;
    }

    if (options.errorType === 'bad-request') {
      throw new BadRequestException(options.message);
    }

    throw new ConflictException(options.message);
  }
}

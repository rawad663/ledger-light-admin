import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  Authorized,
  OrgProtected,
} from '@src/common/decorators/auth.decorator';
import {
  CurrentOrganization,
  type CurrentOrg,
} from '@src/common/decorators/current-org.decorator';
import {
  ApiDoc,
  appendToPaginationQuery,
} from '@src/common/swagger/api-doc.decorator';
import {
  CreateLocationDto,
  GetLocationsQueryDto,
  GetLocationsResponseDto,
  LocationDto,
  UpdateLocationDto,
} from './location.dto';
import { LocationService } from './location.service';

@ApiTags('locations')
@Controller('locations')
@OrgProtected()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ApiDoc({
    summary: 'Get locations',
    description: 'List locations for the active organization with pagination.',
    ok: GetLocationsResponseDto,
    queries: appendToPaginationQuery([
      {
        name: 'search',
        description: 'Search by name, code, address, or city',
        type: String,
      },
      {
        name: 'status',
        description: 'Filter by location status',
        type: String,
      },
      {
        name: 'type',
        description: 'Filter by location type',
        type: String,
      },
    ]),
  })
  getLocations(
    @CurrentOrganization() org: CurrentOrg,
    @Query() query: GetLocationsQueryDto,
  ) {
    return this.locationService.getLocations(org.organizationId, query);
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get location by ID',
    ok: LocationDto,
    notFoundDesc: 'Location not found',
    params: [{ name: 'id', description: 'Location ID', type: String }],
  })
  getLocationById(
    @CurrentOrganization() org: CurrentOrg,
    @Param('id') id: string,
  ) {
    return this.locationService.getLocationById(org.organizationId, id);
  }

  @Post()
  @Authorized('ADMIN', 'MANAGER')
  @ApiDoc({
    summary: 'Create location',
    body: CreateLocationDto,
    created: LocationDto,
    conflictDesc: 'Duplicate location name or code',
  })
  createLocation(
    @CurrentOrganization() org: CurrentOrg,
    @Body() locationData: CreateLocationDto,
  ) {
    return this.locationService.createLocation(
      org.organizationId,
      locationData,
    );
  }

  @Patch(':id')
  @Authorized('ADMIN', 'MANAGER')
  @ApiDoc({
    summary: 'Update location',
    body: UpdateLocationDto,
    ok: LocationDto,
    badRequestDesc: 'Cannot archive a location with inventory on hand',
    notFoundDesc: 'Location not found',
    params: [{ name: 'id', description: 'Location ID', type: String }],
  })
  updateLocation(
    @CurrentOrganization() org: CurrentOrg,
    @Param('id') id: string,
    @Body() locationData: UpdateLocationDto,
  ) {
    return this.locationService.updateLocation(
      org.organizationId,
      id,
      locationData,
    );
  }

  @Delete(':id')
  @Authorized('ADMIN')
  @ApiDoc({
    summary: 'Delete location',
    ok: LocationDto,
    conflictDesc:
      'Cannot delete the only location in an organization or a location with inventory on hand',
    notFoundDesc: 'Location not found',
    params: [{ name: 'id', description: 'Location ID', type: String }],
  })
  deleteLocation(
    @CurrentOrganization() org: CurrentOrg,
    @Param('id') id: string,
  ) {
    return this.locationService.deleteLocation(org.organizationId, id);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@src/infra/prisma/prisma.service';
import {
  CreateAdjustmentBodyDto,
  CreateInventoryLevelDto,
  GetAggregatedInventoryResponseDto,
  GetInventoryQueryDto,
  GetInventoryLevelsResponseDto,
  GetLevelsQueryDto,
  UpdateInventoryLevelDto,
} from './inventory.dto';
import {
  InventoryLevel,
  Location,
  Prisma,
  Product,
} from '@prisma/generated/client';

type AggregatedInventoryRow = GetAggregatedInventoryResponseDto['data'][number];
type InventoryLevelRow = GetInventoryLevelsResponseDto['data'][number];
type ProductWithInventory = Product & {
  inventoryLevels: Array<
    InventoryLevel & {
      location: Pick<Location, 'id' | 'name'>;
    }
  >;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async getInventory(
    organizationId: string,
    query: GetInventoryQueryDto,
  ): Promise<GetAggregatedInventoryResponseDto> {
    const rows = await this.getAggregatedInventorySnapshot(organizationId);
    const filteredRows = query.lowStockOnly
      ? rows.filter((row) => row.isLowStock)
      : rows;
    const sortedRows = this.sortAggregatedInventoryRows(
      filteredRows,
      query.sortBy,
      query.sortOrder,
    );
    const { data, nextCursor } = this.paginateAggregatedInventoryRows(
      sortedRows,
      query.limit,
      query.cursor,
    );

    return {
      data,
      totalCount: filteredRows.length,
      nextCursor,
    };
  }

  async getLowStockProductCount(organizationId: string): Promise<number> {
    const rows = await this.getAggregatedInventorySnapshot(organizationId);

    return rows.filter((row) => row.isLowStock).length;
  }

  async getLevels(
    organizationId: string,
    query: GetLevelsQueryDto,
  ): Promise<GetInventoryLevelsResponseDto> {
    const { locationId, search, lowStockOnly, productId, ...paginationQuery } =
      query;

    const where: Prisma.InventoryLevelWhereInput = {
      product: { organizationId, id: productId },
    };

    if (locationId) {
      where.locationId = query.locationId;
    }

    if (search) {
      where.product = {
        ...(where.product as Prisma.ProductWhereInput),
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [levels, locations, orgWideLevels] = await Promise.all([
      this.prismaService.inventoryLevel.findMany({
        where,
        include: { product: true, location: true },
      }),
      this.prismaService.location.findMany({
        where: { organizationId },
      }),
      this.prismaService.inventoryLevel.findMany({
        where: {
          product: { organizationId },
        },
        include: {
          product: {
            select: {
              reorderThreshold: true,
            },
          },
        },
      }),
    ]);

    const levelRows = levels as (InventoryLevel & {
      product: Product;
      location: Location;
    })[];
    const filteredLevels = lowStockOnly
      ? levelRows.filter(
          (level) => level.quantity <= level.product.reorderThreshold,
        )
      : levelRows;
    const sortedLevels = this.sortInventoryLevelRows(
      filteredLevels,
      paginationQuery.sortBy,
      paginationQuery.sortOrder,
    );
    const paginatedLevels = this.paginateRows(
      sortedLevels,
      paginationQuery.limit,
      paginationQuery.cursor,
      (level) => level.id,
    );
    const lowStockCount = orgWideLevels.filter(
      (level) => level.quantity <= level.product.reorderThreshold,
    ).length;
    const data = paginatedLevels.data.map((level) => ({
      id: level.id,
      quantity: level.quantity,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
      product: level.product,
      location: level.location,
    })) as InventoryLevelRow[];

    return {
      data,
      totalCount: filteredLevels.length,
      nextCursor: paginatedLevels.nextCursor,
      locations,
      lowStockCount,
    };
  }

  async getAggregatedInventorySnapshot(
    organizationId: string,
  ): Promise<AggregatedInventoryRow[]> {
    const products = (await this.prismaService.product.findMany({
      where: { organizationId },
      include: {
        inventoryLevels: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })) as ProductWithInventory[];

    return products.map((product) => {
      const totalQuantity = product.inventoryLevels.reduce(
        (sum, level) => sum + level.quantity,
        0,
      );
      const stockGap = Math.max(product.reorderThreshold - totalQuantity, 0);

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        totalQuantity,
        reorderThreshold: product.reorderThreshold,
        stockGap,
        isLowStock: totalQuantity <= product.reorderThreshold,
        locations: [...product.inventoryLevels]
          .sort((left, right) =>
            left.location.name.localeCompare(right.location.name),
          )
          .map((level) => ({
            locationId: level.location.id,
            locationName: level.location.name,
            quantity: level.quantity,
          })),
      };
    });
  }

  private sortAggregatedInventoryRows(
    rows: AggregatedInventoryRow[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): AggregatedInventoryRow[] {
    const direction = sortOrder === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
      switch (sortBy) {
        case 'stockGap':
          return (
            this.compareNumbers(left.stockGap, right.stockGap, direction) ||
            left.name.localeCompare(right.name)
          );
        case 'totalQuantity':
          return (
            this.compareNumbers(
              left.totalQuantity,
              right.totalQuantity,
              direction,
            ) || left.name.localeCompare(right.name)
          );
        case 'reorderThreshold':
          return (
            this.compareNumbers(
              left.reorderThreshold,
              right.reorderThreshold,
              direction,
            ) || left.name.localeCompare(right.name)
          );
        case 'sku':
          return direction * left.sku.localeCompare(right.sku);
        case 'name':
          return direction * left.name.localeCompare(right.name);
        default:
          return left.name.localeCompare(right.name);
      }
    });
  }

  private compareNumbers(
    left: number,
    right: number,
    direction: 1 | -1,
  ): number {
    if (left === right) {
      return 0;
    }

    return left > right ? direction : -direction;
  }

  private paginateAggregatedInventoryRows(
    rows: AggregatedInventoryRow[],
    limit: number,
    cursor?: string,
  ) {
    return this.paginateRows(rows, limit, cursor, (row) => row.productId);
  }

  private sortInventoryLevelRows(
    rows: Array<
      InventoryLevel & {
        product: Product;
        location: Location;
      }
    >,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const direction = sortOrder === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
      switch (sortBy) {
        case 'quantity':
          return (
            this.compareNumbers(left.quantity, right.quantity, direction) ||
            left.product.name.localeCompare(right.product.name)
          );
        case 'updatedAt':
          return (
            this.compareNumbers(
              left.updatedAt.getTime(),
              right.updatedAt.getTime(),
              direction,
            ) || left.product.name.localeCompare(right.product.name)
          );
        case 'createdAt':
          return (
            this.compareNumbers(
              left.createdAt.getTime(),
              right.createdAt.getTime(),
              direction,
            ) || left.product.name.localeCompare(right.product.name)
          );
        case 'name':
          return (
            direction * left.product.name.localeCompare(right.product.name)
          );
        default:
          return left.product.name.localeCompare(right.product.name);
      }
    });
  }

  private paginateRows<T>(
    rows: T[],
    limit: number,
    cursor: string | undefined,
    getCursor: (row: T) => string,
  ) {
    const startIndex = cursor
      ? Math.max(rows.findIndex((row) => getCursor(row) === cursor) + 1, 0)
      : 0;
    const data = rows.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < rows.length;

    return {
      data,
      nextCursor: hasMore ? getCursor(data[data.length - 1]) : undefined,
    };
  }

  async createAdjustment(
    data: CreateAdjustmentBodyDto & {
      organizationId: string;
      actorUserId?: string;
    },
  ) {
    return this.prismaService.$transaction((tx) =>
      this.createAdjustmentWithTx(tx, data),
    );
  }

  async createAdjustmentWithTx(
    tx: Prisma.TransactionClient,
    data: CreateAdjustmentBodyDto & {
      organizationId: string;
      actorUserId?: string;
    },
  ) {
    let inventoryLevel = await tx.inventoryLevel.findFirst({
      where: { productId: data.productId, locationId: data.locationId },
    });

    if (!inventoryLevel) {
      inventoryLevel = await tx.inventoryLevel.create({
        data: {
          productId: data.productId,
          locationId: data.locationId,
          quantity: 0,
        },
      });
    }

    const newQuantity = inventoryLevel.quantity + data.delta;

    if (newQuantity < 0) {
      throw new BadRequestException(
        'Attempting to reduce product stock below zero',
      );
    }

    const newInventoryLevel = await tx.inventoryLevel.update({
      where: { id: inventoryLevel.id },
      data: { quantity: newQuantity },
    });

    const adjustment = await tx.inventoryAdjustment.create({
      data,
    });

    return {
      inventoryLevel: newInventoryLevel,
      adjustment,
    };
  }

  async createLevel(organizationId: string, data: CreateInventoryLevelDto) {
    const product = await this.prismaService.product.findFirst({
      where: { id: data.productId, organizationId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const location = await this.prismaService.location.findFirst({
      where: { id: data.locationId, organizationId },
    });
    if (!location) throw new NotFoundException('Location not found');

    return this.prismaService.inventoryLevel.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        quantity: data.quantity ?? 0,
      },
    });
  }

  async updateLevel(
    organizationId: string,
    id: string,
    data: UpdateInventoryLevelDto,
  ) {
    const existing = await this.prismaService.inventoryLevel.findFirst({
      where: { id, product: { organizationId }, location: { organizationId } },
    });
    if (!existing) throw new NotFoundException('Inventory level not found');

    return this.prismaService.inventoryLevel.update({
      where: { id },
      data,
    });
  }

  async deleteLevel(organizationId: string, id: string) {
    const existing = await this.prismaService.inventoryLevel.findFirst({
      where: { id, product: { organizationId }, location: { organizationId } },
    });
    if (!existing) throw new NotFoundException('Inventory level not found');

    return this.prismaService.inventoryLevel.delete({ where: { id } });
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30', 10),
        connectionTimeout: parseInt(
          process.env.DB_POOL_CONNECTION_TIMEOUT || '5',
          10,
        ),
      },
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * TODO: Consider in the future moving this helper into a seperate class to keep this service focused
   * on Client Management. Something like "src/common/utils/pagination.ts"
   */
  async paginateMany<T, Y>(
    model: {
      findMany: (args: Y) => Promise<T[]>;
      count: (...args: never[]) => Promise<number>;
    },
    query: Y,
    paginationOptions: {
      limit: number;
      cursor?: string;
      orderBy?: Record<string, 'asc' | 'desc'>;
    },
  ) {
    const countFn = model.count as (arg: {
      where?: unknown;
    }) => Promise<number>;

    const [data, total] = await Promise.all([
      model.findMany({
        ...query,
        take: paginationOptions.limit,
        ...(paginationOptions.cursor && {
          cursor: { id: paginationOptions.cursor },
          skip: 1,
        }),
        orderBy: paginationOptions.orderBy || { createdAt: 'desc' },
      }),
      countFn({ where: (query as { where?: unknown }).where }),
    ]);

    return { data, total };
  }
}

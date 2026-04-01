import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@src/infra/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { createPrismaMock } from '@src/test-utils/prisma.mock';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;
  let inventoryService: { getLowStockProductCount: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    inventoryService = {
      getLowStockProductCount: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('returns summary metrics from live backend data sources', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalCents: 456700 },
    } as any);
    prisma.order.count.mockResolvedValue(12);
    prisma.customer.count.mockResolvedValue(27);
    inventoryService.getLowStockProductCount.mockResolvedValue(5);

    await expect(service.getSummary('org-1')).resolves.toEqual({
      todaysSalesCents: 456700,
      ordersTodayCount: 12,
      lowStockItemsCount: 5,
      activeCustomersCount: 27,
    });

    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: { in: ['CONFIRMED', 'FULFILLED'] },
          placedAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      }),
    );
    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: { in: ['CONFIRMED', 'FULFILLED'] },
          placedAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      }),
    );
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', status: 'ACTIVE' },
    });
    expect(inventoryService.getLowStockProductCount).toHaveBeenCalledWith(
      'org-1',
    );
  });

  it('falls back to zero sales when no orders match today', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalCents: null },
    } as any);
    prisma.order.count.mockResolvedValue(0);
    prisma.customer.count.mockResolvedValue(0);
    inventoryService.getLowStockProductCount.mockResolvedValue(0);

    await expect(service.getSummary('org-1')).resolves.toEqual({
      todaysSalesCents: 0,
      ordersTodayCount: 0,
      lowStockItemsCount: 0,
      activeCustomersCount: 0,
    });
  });
});

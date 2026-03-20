import { PrismaService } from '@src/infra/prisma/prisma.service';
import { OrderService } from './order.service';
import { createPrismaMock } from '@src/test-utils/prisma.mock';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/generated/enums';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: jest.Mocked<PrismaService>;
  let tx: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    tx = createPrismaMock(); // transaction mock
    prisma = createPrismaMock(tx); // prismaService mock

    const module = await Test.createTestingModule({
      providers: [OrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OrderService);
  });

  describe('createOrder', () => {
    const orgId = 'org-1';

    it('creates order with nested items for small carts (<= 20)', async () => {
      const customerId = 'cust-1';
      const locationId = 'loc-1';

      // Reference checks succeed
      (tx.customer.findFirst as jest.Mock).mockResolvedValue({
        id: customerId,
      });
      (tx.location.findFirst as jest.Mock).mockResolvedValue({
        id: locationId,
      });

      // Product snapshot
      const p1 = { id: 'p1', name: 'Prod 1', sku: 'SKU-1', priceCents: 1000 };
      const p2 = { id: 'p2', name: 'Prod 2', sku: null, priceCents: 2500 };
      (tx.product.findMany as jest.Mock).mockResolvedValue([p1, p2]);

      const input = {
        customerId,
        locationId,
        orderItems: [
          { productId: 'p1', qty: 2, discountCents: 100, taxCents: 50 },
          { productId: 'p2', qty: 1 }, // defaults: discount=0, tax=0; sku should be undefined
        ],
      };

      const expectedItems = [
        {
          productId: 'p1',
          productName: 'Prod 1',
          sku: 'SKU-1',
          qty: 2,
          unitPriceCents: 1000,
          lineSubtotalCents: 2000,
          discountCents: 100,
          taxCents: 50,
          lineTotalCents: 1950,
        },
        {
          productId: 'p2',
          productName: 'Prod 2',
          sku: undefined,
          qty: 1,
          unitPriceCents: 2500,
          lineSubtotalCents: 2500,
          discountCents: 0,
          taxCents: 0,
          lineTotalCents: 2500,
        },
      ];

      const expectedTotals = {
        subtotalCents: 2000 + 2500, // 4500
        taxCents: 50,
        discountCents: 100,
        totalCents: 1950 + 2500, // 4450
      };

      const created = {
        id: 'ord-1',
        organizationId: orgId,
        customerId,
        locationId,
        status: OrderStatus.PENDING,
        ...expectedTotals,
        items: [
          { id: 'oi-1', orderId: 'ord-1', ...expectedItems[0] },
          { id: 'oi-2', orderId: 'ord-1', ...expectedItems[1] },
        ],
      };
      (tx.order.create as jest.Mock).mockResolvedValue(created);

      const res = await service.createOrder(orgId, input as any);

      // Assertions
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Reference validations
      expect(tx.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, organizationId: orgId },
        select: { id: true },
      });
      expect(tx.location.findFirst).toHaveBeenCalledWith({
        where: { id: locationId, organizationId: orgId },
        select: { id: true },
      });

      // Product snapshot query
      expect(tx.product.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['p1', 'p2'] },
          organizationId: orgId,
          active: true,
        },
        select: { id: true, name: true, sku: true, priceCents: true },
      });

      // Order creation payload assertions
      expect(tx.order.create).toHaveBeenCalledWith({
        data: {
          ...expectedTotals,
          customerId,
          locationId,
          organizationId: orgId,
          status: OrderStatus.PENDING,
          items: { create: expectedItems },
        },
        include: { items: true },
      });

      expect(res).toEqual(created);
    });
  });
});

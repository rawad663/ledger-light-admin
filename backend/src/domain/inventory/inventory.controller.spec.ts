import { Test } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  OrganizationContextGuard,
  JwtAuthGuard,
  RolesGuard,
} from '@src/common/guards';
import { PrismaService } from '@src/infra/prisma/prisma.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            getLevels: jest.fn(),
            createAdjustment: jest.fn(),
          },
        },
        {
          provide: OrganizationContextGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get(InventoryController);
    service = module.get(InventoryService);
  });

  describe('getLevels', () => {
    it('forwards query to service and returns result', async () => {
      const query = {
        productId: 'prod-1',
        locationId: 'loc-1',
        limit: 10,
        cursor: undefined,
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      } as any;
      const result = { data: [], totalCount: 0, nextCursor: undefined } as any;
      service.getLevels.mockResolvedValue(result);

      const res = await controller.getLevels(query);

      expect(service.getLevels).toHaveBeenCalledWith(query);
      expect(res).toBe(result);
    });
  });

  describe('createAdjustment', () => {
    it('injects org and user context and forwards to service', async () => {
      const user = { id: 'user-1' } as any;
      const org = { organizationId: 'org-1', role: 'MANAGER' } as any;
      const body = {
        productId: 'prod-1',
        locationId: 'loc-1',
        delta: 5,
        reason: 'RECEIVE',
        note: 'Inbound shipment',
      } as any;
      const result = {
        inventoryLevel: { id: 'lvl-1' },
        adjustment: { id: 'adj-1' },
      } as any;
      service.createAdjustment.mockResolvedValue(result);

      const res = await controller.createAdjustment(user, org, body);

      expect(service.createAdjustment).toHaveBeenCalledWith({
        organizationId: 'org-1',
        actorUserId: 'user-1',
        ...body,
      });
      expect(res).toBe(result);
    });
  });
});

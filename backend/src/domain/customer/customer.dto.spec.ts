import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CustomerDto,
  CustomerListItemDto,
  CustomerDetailDto,
  CustomerRecentOrderDto,
  GetCustomersQueryDto,
  GetCustomersResponseDto,
} from './customer.dto';
import { CustomerStatus } from '@prisma/generated/client';
import { OrderStatus } from '@prisma/generated/enums';

const uuid = 'a5b2b7f0-ec1b-4a0a-9e08-7e2dd6e7d5a0';
const uuid2 = '0b5f7ae8-5835-4ef4-bfb7-7d1b2d8d9d1a';

const validCustomer = {
  id: uuid,
  organizationId: uuid2,
  name: 'John Doe',
  email: 'john@doe.com',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: CustomerStatus.ACTIVE,
  internalNote: null,
};

describe('CustomerDto validation', () => {
  it('accepts a valid customer', async () => {
    const dto = plainToInstance(CustomerDto, validCustomer);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid fields', async () => {
    const bad = {
      ...validCustomer,
      id: 'not-uuid',
      email: 'bad',
      createdAt: 'x',
      status: 'NOPE',
    };
    const dto = plainToInstance(CustomerDto, bad);
    const errors = await validate(dto);
    expect(errors.length).toBe(4);
  });
});

describe('CustomerListItemDto validation', () => {
  it('accepts valid customer with aggregate fields', async () => {
    const dto = plainToInstance(CustomerListItemDto, {
      ...validCustomer,
      lifetimeSpendCents: 5000,
      ordersCount: 3,
      avgOrderValueCents: 1667,
      lastOrderDate: new Date(),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts null lastOrderDate', async () => {
    const dto = plainToInstance(CustomerListItemDto, {
      ...validCustomer,
      lifetimeSpendCents: 0,
      ordersCount: 0,
      avgOrderValueCents: 0,
      lastOrderDate: null,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('GetCustomersQueryDto validation', () => {
  it('accepts empty object with defaults', async () => {
    const dto = plainToInstance(GetCustomersQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid search', async () => {
    const dto = plainToInstance(GetCustomersQueryDto, { search: 'john' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CustomerRecentOrderDto validation', () => {
  it('accepts a valid recent order', async () => {
    const dto = plainToInstance(CustomerRecentOrderDto, {
      id: uuid,
      totalCents: 3000,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid status', async () => {
    const dto = plainToInstance(CustomerRecentOrderDto, {
      id: uuid,
      totalCents: 3000,
      status: 'INVALID',
      createdAt: new Date(),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CustomerDetailDto validation', () => {
  it('accepts valid detail with recent orders', async () => {
    const dto = plainToInstance(CustomerDetailDto, {
      ...validCustomer,
      lifetimeSpendCents: 10000,
      ordersCount: 4,
      avgOrderValueCents: 2500,
      lastOrderDate: new Date(),
      recentOrders: [
        {
          id: uuid,
          totalCents: 3000,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts empty recent orders', async () => {
    const dto = plainToInstance(CustomerDetailDto, {
      ...validCustomer,
      lifetimeSpendCents: 0,
      ordersCount: 0,
      avgOrderValueCents: 0,
      lastOrderDate: null,
      recentOrders: [],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('GetCustomersResponseDto validation', () => {
  it('validates nested data and totals', async () => {
    const payload = {
      data: [
        {
          ...validCustomer,
          lifetimeSpendCents: 5000,
          ordersCount: 2,
          avgOrderValueCents: 2500,
          lastOrderDate: new Date(),
        },
      ],
      totalCount: 1,
      nextCursor: undefined,
    };
    const dto = plainToInstance(GetCustomersResponseDto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects when data invalid', async () => {
    const payload = { data: [{}], totalCount: 'one' };
    const dto = plainToInstance(GetCustomersResponseDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

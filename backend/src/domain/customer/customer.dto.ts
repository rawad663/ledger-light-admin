import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDate,
  IsEmail,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CustomerStatus } from '@prisma/generated/client';
import { OrderStatus } from '@prisma/generated/enums';
import { PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  createPaginatedResponseDto,
  PaginationOptionsQueryParamDto,
} from '@src/common/dto/pagination.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class CustomerDto {
  @IsString()
  @IsUUID('loose')
  id: string;

  @IsString()
  @IsUUID('loose')
  organizationId: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone: string | null;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  @IsEnum(CustomerStatus)
  @ApiProperty({ enum: CustomerStatus })
  status: CustomerStatus;

  @IsOptional()
  @IsString()
  internalNote: string | null;
}

export class CreateCustomerDto extends PickType(CustomerDto, [
  'name',
  'email',
  'phone',
  'internalNote',
] as const) {}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone: string | null;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status: CustomerStatus;

  @IsOptional()
  @IsString()
  internalNote: string | null;
}

export class GetCustomersQueryDto extends PaginationOptionsQueryParamDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  @ApiProperty({ enum: CustomerStatus })
  status?: CustomerStatus;
}

export class CustomerListItemDto extends CustomerDto {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  lifetimeSpendCents: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  ordersCount: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  avgOrderValueCents: number;

  @IsDate()
  @IsOptional()
  lastOrderDate?: Date | null;
}

export class GetCustomersResponseDto extends createPaginatedResponseDto(
  CustomerListItemDto,
) {}

export class CustomerRecentOrderDto {
  @IsUUID('loose')
  id: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  totalCents: number;

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsDate()
  createdAt: Date;
}

export class CustomerDetailDto extends CustomerDto {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  lifetimeSpendCents: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  ordersCount: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  avgOrderValueCents: number;

  @IsDate()
  @IsOptional()
  lastOrderDate?: Date | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerRecentOrderDto)
  @ApiProperty({ type: [CustomerRecentOrderDto] })
  recentOrders: CustomerRecentOrderDto[];
}

import { LocationStatus, LocationType } from '@prisma/generated/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDate,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  createPaginatedResponseDto,
  PaginationOptionsQueryParamDto,
} from '@src/common/dto/pagination.dto';

export { LocationStatus, LocationType };

export class LocationDto {
  @IsUUID('loose')
  @IsString()
  id: string;

  @IsUUID('loose')
  @IsString()
  organizationId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsEnum(LocationType)
  @ApiProperty({ enum: LocationType })
  type: LocationType;

  @IsEnum(LocationStatus)
  @ApiProperty({ enum: LocationStatus })
  status: LocationStatus;

  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  stateProvince?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsString()
  countryCode: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}

export class CreateLocationDto extends PickType(LocationDto, [
  'name',
  'code',
  'type',
  'addressLine1',
  'addressLine2',
  'city',
  'stateProvince',
  'postalCode',
  'countryCode',
  'notes',
] as const) {}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsEnum(LocationType)
  @ApiProperty({ enum: LocationType })
  type?: LocationType;

  @IsOptional()
  @IsEnum(LocationStatus)
  @ApiProperty({ enum: LocationStatus })
  status?: LocationStatus;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateProvince?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class GetLocationsQueryDto extends PaginationOptionsQueryParamDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  @ApiProperty({ enum: LocationStatus })
  status?: LocationStatus;

  @IsOptional()
  @IsEnum(LocationType)
  @ApiProperty({ enum: LocationType })
  type?: LocationType;
}

export class LocationListItemDto extends LocationDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  onHandQuantity: number;
}

export class GetLocationsResponseDto extends createPaginatedResponseDto(
  LocationListItemDto,
) {}

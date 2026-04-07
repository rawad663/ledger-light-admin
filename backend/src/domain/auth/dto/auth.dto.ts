import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MembershipStatus, Role } from '@prisma/generated/enums';

export class OrganizationDto {
  @IsString()
  @IsUUID('loose')
  id: string;

  @IsString()
  name: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}

export class MembershipDto {
  @IsString()
  @IsUUID('loose')
  id: string;

  @IsString()
  @IsUUID('loose')
  organizationId: string;

  @IsString()
  @IsUUID('loose')
  userId: string;

  @IsEnum(MembershipStatus)
  status: MembershipStatus;

  role: Role;

  @IsBoolean()
  hasAllLocations: boolean;

  @IsArray()
  @IsString({ each: true })
  allowedLocationIds: string[];

  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationDto)
  organization?: OrganizationDto;
}

export class UserPublicDto {
  @IsString()
  @IsUUID('loose')
  id: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsDate()
  lastLoginAt?: Date | null;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}

export class RefreshTokenPublicDto {
  @IsString()
  @IsUUID('loose')
  id: string;

  @IsString()
  @IsUUID('loose')
  userId: string;

  @IsDate()
  expiresAt: Date;

  @IsOptional()
  @IsDate()
  revokedAt?: Date | null;

  @IsDate()
  createdAt: Date;
}

export class LoginResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  refreshTokenRaw: string;

  @ValidateNested()
  @Type(() => RefreshTokenPublicDto)
  refreshToken: RefreshTokenPublicDto;

  @ValidateNested()
  @Type(() => UserPublicDto)
  user: UserPublicDto;

  @ValidateNested({ each: true })
  @Type(() => MembershipDto)
  memberships: MembershipDto[];
}

export class RefreshResponseDto {
  @IsString()
  accessToken: string;

  @ValidateNested()
  @Type(() => UserPublicDto)
  user: UserPublicDto;
}

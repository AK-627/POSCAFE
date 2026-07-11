import { IsNotEmpty, IsString, IsUUID, IsEnum, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  CHEF = 'chef'
}

export class User {
  @IsUUID()
  id!: string;

  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  passwordHash!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsBoolean()
  isActive!: boolean;

  lastLoginAt?: Date;
  createdAt!: Date;
  updatedAt?: Date;
}

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
}
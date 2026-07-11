import { IsNotEmpty, IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export class Tenant {
  @IsUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsEnum(TenantStatus)
  status!: TenantStatus;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan = SubscriptionPlan.STARTER;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}

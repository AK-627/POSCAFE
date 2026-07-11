import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@skynether/shared/types/user';

export interface RegisterTenantInput {
  name: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  timezone?: string;
  currency?: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  async register(input: RegisterTenantInput): Promise<{ tenant: TenantEntity; userId: string }> {
    const existing = await this.tenantRepository.findOne({ where: { email: input.email } });
    if (existing) throw new ConflictException('A cafe with this email is already registered');

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    const tenant = await this.tenantRepository.save(
      this.tenantRepository.create({
        name: input.name,
        email: input.email,
        slug: `${slug}-${Date.now().toString(36)}`,
        timezone: input.timezone ?? 'UTC',
        currency: input.currency ?? 'USD',
      }),
    );

    // Create owner user
    const owner = await this.usersService.createUser({
      email: input.email,
      password: input.ownerPassword,
      firstName: input.ownerFirstName,
      lastName: input.ownerLastName,
      role: UserRole.OWNER,
      tenantId: tenant.id,
    });

    // Start free trial
    await this.subscriptionsService.createTrial(tenant.id, 'starter');

    return { tenant, userId: owner.id };
  }

  async findById(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(
    id: string,
    updates: Partial<Pick<TenantEntity, 'name' | 'phone' | 'address' | 'timezone' | 'currency' | 'taxRate' | 'serviceCharge' | 'settings'>>,
  ): Promise<TenantEntity> {
    const tenant = await this.findById(id);
    Object.assign(tenant, updates);
    return this.tenantRepository.save(tenant);
  }
}

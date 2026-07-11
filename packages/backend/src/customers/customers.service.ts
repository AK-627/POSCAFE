import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CustomerEntity } from './customer.entity';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
} from './dto/customer.dto';

// Loyalty points configuration
const LOYALTY_POINTS_PER_CURRENCY = 1; // 1 point per currency unit spent

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────

  async createCustomer(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    // Check for duplicates by phone or email
    if (dto.phoneNumber) {
      const existing = await this.customerRepository.findOne({
        where: { tenantId, phoneNumber: dto.phoneNumber },
      });
      if (existing) {
        throw new BadRequestException('Customer with this phone number already exists');
      }
    }

    if (dto.email) {
      const existing = await this.customerRepository.findOne({
        where: { tenantId, email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    const customer = this.customerRepository.create({
      tenantId,
      ...dto,
      dataConsentAt: dto.dataConsentGiven ? new Date() : undefined,
    });

    const saved = await this.customerRepository.save(customer);
    this.logger.log(`Customer created: ${saved.firstName ?? ''} ${saved.lastName ?? ''} (${saved.id})`);
    return saved;
  }

  async getCustomer(tenantId: string, customerId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerEntity> {
    const customer = await this.getCustomer(tenantId, customerId);
    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  async listCustomers(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'loyaltyPoints' | 'totalSpent' | 'lastOrder';
    },
  ): Promise<{ customers: CustomerEntity[]; total: number }> {
    const orderMap: Record<string, any> = {
      name: { firstName: 'ASC' },
      loyaltyPoints: { loyaltyPoints: 'DESC' },
      totalSpent: { totalSpent: 'DESC' },
      lastOrder: { lastOrderAt: 'DESC' },
    };

    const [customers, total] = await this.customerRepository.findAndCount({
      where: { tenantId, isActive: true },
      order: orderMap[options?.sortBy ?? 'name'] ?? { firstName: 'ASC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return { customers, total };
  }

  async searchCustomers(
    tenantId: string,
    query: string,
  ): Promise<CustomerEntity[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;

    return this.customerRepository.find({
      where: [
        { tenantId, firstName: ILike(searchPattern), isActive: true },
        { tenantId, lastName: ILike(searchPattern), isActive: true },
        { tenantId, email: ILike(searchPattern), isActive: true },
        { tenantId, phoneNumber: ILike(searchPattern), isActive: true },
      ],
      take: 20,
      order: { firstName: 'ASC' },
    });
  }

  // ── Loyalty ─────────────────────────────────────────────────

  async updateLoyaltyPoints(
    tenantId: string,
    customerId: string,
    dto: UpdateLoyaltyPointsDto,
  ): Promise<CustomerEntity> {
    const customer = await this.getCustomer(tenantId, customerId);

    const newPoints = customer.loyaltyPoints + dto.points;
    if (newPoints < 0) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    customer.loyaltyPoints = newPoints;
    const saved = await this.customerRepository.save(customer);

    this.logger.log(
      `Customer ${customerId} loyalty: ${dto.points > 0 ? '+' : ''}${dto.points} (${dto.reason}). Total: ${newPoints}`,
    );

    return saved;
  }

  /**
   * Award loyalty points based on order amount.
   * Called automatically when an order is paid.
   */
  async awardLoyaltyForOrder(
    tenantId: string,
    customerId: string,
    orderAmount: number,
  ): Promise<void> {
    const customer = await this.getCustomer(tenantId, customerId);

    const pointsEarned = Math.floor(orderAmount * LOYALTY_POINTS_PER_CURRENCY);
    customer.loyaltyPoints += pointsEarned;
    customer.totalOrders += 1;
    customer.totalSpent = Number(customer.totalSpent) + orderAmount;
    customer.lastOrderAt = new Date();

    await this.customerRepository.save(customer);
    this.logger.log(`Customer ${customerId} earned ${pointsEarned} loyalty points`);
  }

  // ── Privacy & Data Management ───────────────────────────────

  async grantDataConsent(tenantId: string, customerId: string): Promise<CustomerEntity> {
    const customer = await this.getCustomer(tenantId, customerId);
    customer.dataConsentGiven = true;
    customer.dataConsentAt = new Date();
    return this.customerRepository.save(customer);
  }

  async revokeDataConsent(tenantId: string, customerId: string): Promise<CustomerEntity> {
    const customer = await this.getCustomer(tenantId, customerId);
    customer.dataConsentGiven = false;
    customer.dataConsentAt = undefined;
    return this.customerRepository.save(customer);
  }

  /**
   * Anonymize customer data (GDPR right to be forgotten).
   * Preserves the record for order history but removes PII.
   */
  async anonymizeCustomer(tenantId: string, customerId: string): Promise<CustomerEntity> {
    const customer = await this.getCustomer(tenantId, customerId);

    customer.firstName = 'Anonymized';
    customer.lastName = 'Customer';
    customer.email = undefined;
    customer.phoneNumber = undefined;
    customer.notes = undefined;
    customer.dataConsentGiven = false;
    customer.dataConsentAt = undefined;
    customer.isActive = false;

    const saved = await this.customerRepository.save(customer);
    this.logger.log(`Customer ${customerId} data anonymized (GDPR)`);
    return saved;
  }

  /**
   * Export customer data (GDPR right to data portability).
   */
  async exportCustomerData(
    tenantId: string,
    customerId: string,
  ): Promise<Record<string, any>> {
    const customer = await this.getCustomer(tenantId, customerId);

    return {
      personalInfo: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
      },
      loyalty: {
        points: customer.loyaltyPoints,
        totalOrders: customer.totalOrders,
        totalSpent: Number(customer.totalSpent),
        lastOrderAt: customer.lastOrderAt,
      },
      consent: {
        dataConsentGiven: customer.dataConsentGiven,
        dataConsentAt: customer.dataConsentAt,
      },
      accountCreated: customer.createdAt,
      exportedAt: new Date(),
    };
  }

  // ── Statistics ──────────────────────────────────────────────

  async getTopCustomers(
    tenantId: string,
    limit: number = 10,
  ): Promise<CustomerEntity[]> {
    return this.customerRepository.find({
      where: { tenantId, isActive: true },
      order: { totalSpent: 'DESC' },
      take: limit,
    });
  }
}

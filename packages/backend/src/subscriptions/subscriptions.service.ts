import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SubscriptionEntity,
  SubscriptionInvoiceEntity,
  SubscriptionPlan,
  BillingCycle,
} from './subscription.entity';

// Plan pricing configuration
const PLAN_CONFIG: Record<SubscriptionPlan, {
  monthlyPrice: number;
  annualPrice: number;
  maxLocations: number;
  maxUsers: number;
}> = {
  starter: { monthlyPrice: 29, annualPrice: 290, maxLocations: 1, maxUsers: 5 },
  professional: { monthlyPrice: 79, annualPrice: 790, maxLocations: 3, maxUsers: 15 },
  enterprise: { monthlyPrice: 199, annualPrice: 1990, maxLocations: 999, maxUsers: 999 },
};

const TRIAL_DAYS = 14;

@Injectable()
export class SubscriptionsService {
  private invoiceCounter = 0;

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionInvoiceEntity)
    private readonly invoiceRepository: Repository<SubscriptionInvoiceEntity>,
  ) {}

  // ── Subscription Lifecycle ──────────────────────────────────

  async createTrial(tenantId: string, plan: SubscriptionPlan = 'starter'): Promise<SubscriptionEntity> {
    const existing = await this.subscriptionRepository.findOne({ where: { tenantId } });
    if (existing) throw new BadRequestException('Tenant already has a subscription');

    const config = PLAN_CONFIG[plan];
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const subscription = this.subscriptionRepository.create({
      tenantId,
      plan,
      status: 'trial',
      billingCycle: 'monthly',
      pricePerMonth: config.monthlyPrice,
      maxLocations: config.maxLocations,
      maxUsers: config.maxUsers,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    });

    return this.subscriptionRepository.save(subscription);
  }

  async activateSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscription(tenantId);
    const config = PLAN_CONFIG[plan];
    const now = new Date();

    subscription.plan = plan;
    subscription.status = 'active';
    subscription.billingCycle = billingCycle;
    subscription.pricePerMonth = billingCycle === 'annual' ? config.annualPrice / 12 : config.monthlyPrice;
    subscription.maxLocations = config.maxLocations;
    subscription.maxUsers = config.maxUsers;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(now, billingCycle);

    const saved = await this.subscriptionRepository.save(subscription);

    // Generate first invoice
    await this.generateInvoice(saved);

    return saved;
  }

  async changePlan(tenantId: string, newPlan: SubscriptionPlan): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscription(tenantId);
    if (subscription.status !== 'active') {
      throw new BadRequestException('Can only change plan on active subscriptions');
    }

    const config = PLAN_CONFIG[newPlan];
    subscription.plan = newPlan;
    subscription.pricePerMonth = subscription.billingCycle === 'annual'
      ? config.annualPrice / 12
      : config.monthlyPrice;
    subscription.maxLocations = config.maxLocations;
    subscription.maxUsers = config.maxUsers;

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(tenantId: string): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscription(tenantId);
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    return this.subscriptionRepository.save(subscription);
  }

  async getSubscription(tenantId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  // ── Access Checks ───────────────────────────────────────────

  async isFeatureAccessible(tenantId: string): Promise<boolean> {
    try {
      const sub = await this.getSubscription(tenantId);
      if (sub.status === 'active' || sub.status === 'trial') return true;
      if (sub.status === 'past_due') {
        // Grace period: allow access for 7 days past due
        const gracePeriodEnd = new Date(sub.currentPeriodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Date() < gracePeriodEnd;
      }
      return false;
    } catch {
      return false;
    }
  }

  async checkLocationLimit(tenantId: string, currentLocations: number): Promise<boolean> {
    const sub = await this.getSubscription(tenantId);
    return currentLocations < sub.maxLocations;
  }

  async checkUserLimit(tenantId: string, currentUsers: number): Promise<boolean> {
    const sub = await this.getSubscription(tenantId);
    return currentUsers < sub.maxUsers;
  }

  // ── Invoicing ───────────────────────────────────────────────

  async getInvoices(tenantId: string): Promise<SubscriptionInvoiceEntity[]> {
    return this.invoiceRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateInvoice(subscription: SubscriptionEntity): Promise<SubscriptionInvoiceEntity> {
    this.invoiceCounter++;
    const amount = subscription.billingCycle === 'annual'
      ? subscription.pricePerMonth * 12
      : subscription.pricePerMonth;

    const invoice = this.invoiceRepository.create({
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      invoiceNumber: `SUB-${Date.now()}-${String(this.invoiceCounter).padStart(4, '0')}`,
      amount,
      status: 'pending',
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    });

    return this.invoiceRepository.save(invoice);
  }

  // ── Plan Info ───────────────────────────────────────────────

  getAvailablePlans() {
    return Object.entries(PLAN_CONFIG).map(([name, config]) => ({
      name,
      monthlyPrice: config.monthlyPrice,
      annualPrice: config.annualPrice,
      maxLocations: config.maxLocations,
      maxUsers: config.maxUsers,
      annualSavings: (config.monthlyPrice * 12) - config.annualPrice,
    }));
  }

  // ── Scheduled Checks ───────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredTrials(): Promise<void> {
    const expired = await this.subscriptionRepository.find({
      where: { status: 'trial', trialEndsAt: LessThan(new Date()) },
    });

    for (const sub of expired) {
      sub.status = 'expired';
      await this.subscriptionRepository.save(sub);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkExpiredSubscriptions(): Promise<void> {
    const expired = await this.subscriptionRepository.find({
      where: { status: 'active', currentPeriodEnd: LessThan(new Date()) },
    });

    for (const sub of expired) {
      sub.status = 'past_due';
      await this.subscriptionRepository.save(sub);
    }
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    if (cycle === 'annual') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}

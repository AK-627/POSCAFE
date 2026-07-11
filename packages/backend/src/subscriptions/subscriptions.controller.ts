import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';
import { SubscriptionPlan, BillingCycle } from './subscription.entity';
import { SkipSubscriptionCheck } from './skip-subscription-check.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@SkipSubscriptionCheck() // Subscription endpoints must remain accessible even when expired
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  async getPlans() {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Get('current')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get current subscription for tenant' })
  async getCurrentSubscription(@CurrentUser() user: AuthPayload) {
    return this.subscriptionsService.getSubscription(user.tenantId);
  }

  @Post('activate')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Activate a subscription plan' })
  async activate(
    @CurrentUser() user: AuthPayload,
    @Body() body: { plan: SubscriptionPlan; billingCycle: BillingCycle },
  ) {
    return this.subscriptionsService.activateSubscription(user.tenantId, body.plan, body.billingCycle);
  }

  @Patch('change-plan')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(
    @CurrentUser() user: AuthPayload,
    @Body() body: { plan: SubscriptionPlan },
  ) {
    return this.subscriptionsService.changePlan(user.tenantId, body.plan);
  }

  @Post('cancel')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancel(@CurrentUser() user: AuthPayload) {
    return this.subscriptionsService.cancelSubscription(user.tenantId);
  }

  @Get('invoices')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get subscription billing history' })
  async getInvoices(@CurrentUser() user: AuthPayload) {
    return this.subscriptionsService.getInvoices(user.tenantId);
  }
}

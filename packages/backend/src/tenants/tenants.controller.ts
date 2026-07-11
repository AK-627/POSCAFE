import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService, RegisterTenantInput } from './tenants.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../subscriptions/skip-subscription-check.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';
import { TenantEntity } from './tenant.entity';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  @Public()
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: 'Register a new café and start a 14-day free trial' })
  async register(@Body() input: RegisterTenantInput) {
    const { tenant, userId } = await this.tenantsService.register(input);
    return {
      message: 'Registration successful. Your 14-day trial has started.',
      tenantId: tenant.id,
      userId,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant details' })
  async getMe(@CurrentUser() user: AuthPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateMe(
    @CurrentUser() user: AuthPayload,
    @Body() updates: Partial<TenantEntity>,
  ) {
    return this.tenantsService.update(user.tenantId, updates);
  }
}

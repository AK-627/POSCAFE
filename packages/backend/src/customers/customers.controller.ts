import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
} from './dto/customer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── CRUD ────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async createCustomer(
    @CurrentUser() user: AuthPayload,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createCustomer(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers with sorting' })
  async listCustomers(
    @CurrentUser() user: AuthPayload,
    @Query('sortBy') sortBy?: 'name' | 'loyaltyPoints' | 'totalSpent' | 'lastOrder',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.customersService.listCustomers(user.tenantId, { sortBy, limit, offset });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers by name, email, or phone' })
  async searchCustomers(
    @CurrentUser() user: AuthPayload,
    @Query('q') query: string,
  ) {
    return this.customersService.searchCustomers(user.tenantId, query);
  }

  @Get('top')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get top customers by spending' })
  async getTopCustomers(
    @CurrentUser() user: AuthPayload,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.getTopCustomers(user.tenantId, limit);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get a customer by ID' })
  async getCustomer(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.getCustomer(user.tenantId, customerId);
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Update customer info' })
  async updateCustomer(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(user.tenantId, customerId, dto);
  }

  // ── Loyalty ─────────────────────────────────────────────────

  @Post(':customerId/loyalty')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Manually adjust loyalty points' })
  async updateLoyaltyPoints(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateLoyaltyPointsDto,
  ) {
    return this.customersService.updateLoyaltyPoints(user.tenantId, customerId, dto);
  }

  // ── Privacy & GDPR ─────────────────────────────────────────

  @Post(':customerId/consent')
  @ApiOperation({ summary: 'Grant data consent' })
  async grantConsent(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.grantDataConsent(user.tenantId, customerId);
  }

  @Delete(':customerId/consent')
  @ApiOperation({ summary: 'Revoke data consent' })
  async revokeConsent(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.revokeDataConsent(user.tenantId, customerId);
  }

  @Get(':customerId/export')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export customer data (GDPR data portability)' })
  async exportData(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.exportCustomerData(user.tenantId, customerId);
  }

  @Delete(':customerId/anonymize')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Anonymize customer data (GDPR right to be forgotten)' })
  async anonymize(
    @CurrentUser() user: AuthPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.anonymizeCustomer(user.tenantId, customerId);
  }
}

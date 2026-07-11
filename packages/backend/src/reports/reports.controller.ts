import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report for a date range' })
  async getSalesReport(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSalesReport(user.tenantId, new Date(from), new Date(to));
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Get daily sales breakdown' })
  async getDailySales(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getDailySalesBreakdown(user.tenantId, new Date(from), new Date(to));
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Get top selling menu items' })
  async getTopItems(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getTopSellingItems(user.tenantId, new Date(from), new Date(to), limit);
  }

  @Get('peak-hours')
  @ApiOperation({ summary: 'Get order volume by hour of day' })
  async getPeakHours(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getPeakHours(user.tenantId, new Date(from), new Date(to));
  }

  @Get('staff-performance')
  @ApiOperation({ summary: 'Get aggregated staff performance metrics' })
  async getStaffPerformance(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getStaffPerformanceReport(user.tenantId, from, to);
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get profit summary (revenue, refunds, tips)' })
  async getProfitSummary(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getProfitSummary(user.tenantId, new Date(from), new Date(to));
  }
}

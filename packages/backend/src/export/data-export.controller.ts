import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DataExportService } from './data-export.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('export')
@ApiBearerAuth()
@Controller('export')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

  @Get('orders')
  @ApiOperation({ summary: 'Export orders as CSV' })
  async exportOrders(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportOrdersCsv({
      tenantId: user.tenantId,
      from: new Date(from),
      to: new Date(to),
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders_${from}_${to}.csv`);
    res.send(csv);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Export payments as CSV' })
  async exportPayments(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportPaymentsCsv({
      tenantId: user.tenantId,
      from: new Date(from),
      to: new Date(to),
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments_${from}_${to}.csv`);
    res.send(csv);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Export customers as CSV (only with data consent)' })
  async exportCustomers(
    @CurrentUser() user: AuthPayload,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportCustomersCsv(user.tenantId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  }

  @Get('tax-report')
  @ApiOperation({ summary: 'Generate tax-purpose CSV report' })
  async exportTaxReport(
    @CurrentUser() user: AuthPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.generateTaxReport({
      tenantId: user.tenantId,
      from: new Date(from),
      to: new Date(to),
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tax_report_${from}_${to}.csv`);
    res.send(csv);
  }

  @Get('backup-manifest')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Generate backup manifest for tenant data' })
  async getBackupManifest(@CurrentUser() user: AuthPayload) {
    return this.exportService.createBackupManifest(user.tenantId);
  }
}

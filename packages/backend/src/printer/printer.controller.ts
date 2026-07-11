import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrinterService, PrintContent } from './printer.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';
import { PrinterEntity } from './printer.entity';

@ApiTags('printers')
@ApiBearerAuth()
@Controller('printers')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  // ── Printer Config ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List configured printers' })
  async listPrinters(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.printerService.listPrinters(user.tenantId, branchId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a new printer' })
  async addPrinter(
    @CurrentUser() user: AuthPayload,
    @Body() config: Partial<PrinterEntity> & { branchId: string },
  ) {
    return this.printerService.addPrinter(user.tenantId, config.branchId, config);
  }

  @Patch(':printerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update printer configuration' })
  async updatePrinter(
    @CurrentUser() user: AuthPayload,
    @Param('printerId') printerId: string,
    @Body() updates: Partial<PrinterEntity>,
  ) {
    return this.printerService.updatePrinter(user.tenantId, printerId, updates);
  }

  @Delete(':printerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove a printer' })
  async deletePrinter(
    @CurrentUser() user: AuthPayload,
    @Param('printerId') printerId: string,
  ) {
    return this.printerService.deletePrinter(user.tenantId, printerId);
  }

  // ── Print Operations ────────────────────────────────────────

  @Post('print')
  @ApiOperation({ summary: 'Send a document to the print queue' })
  async print(
    @CurrentUser() user: AuthPayload,
    @Body() input: PrintContent & { branchId: string },
  ) {
    return this.printerService.print(user.tenantId, input.branchId, input);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Get print preview for a document' })
  async preview(
    @CurrentUser() user: AuthPayload,
    @Body() input: PrintContent & { branchId: string },
  ) {
    return this.printerService.getPreview(user.tenantId, input.branchId, input);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get print queue' })
  async getQueue(
    @CurrentUser() user: AuthPayload,
    @Query('printerId') printerId?: string,
  ) {
    return this.printerService.getQueue(user.tenantId, printerId);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get print job status' })
  async getJobStatus(
    @CurrentUser() user: AuthPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.printerService.getJobStatus(user.tenantId, jobId);
  }

  @Patch('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel a queued print job' })
  async cancelJob(
    @CurrentUser() user: AuthPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.printerService.cancelJob(user.tenantId, jobId);
  }
}

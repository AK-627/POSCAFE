import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService, CreateScheduleInput } from './staff.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all staff members with summary metrics' })
  async getStaffSummary(@CurrentUser() user: AuthPayload) {
    return this.staffService.getStaffSummary(user.tenantId);
  }

  // ── Schedules ───────────────────────────────────────────────

  @Post('schedules')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a shift schedule for a staff member' })
  async createSchedule(
    @CurrentUser() user: AuthPayload,
    @Body() input: CreateScheduleInput,
  ) {
    return this.staffService.createSchedule(user.tenantId, input);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get schedules with optional date/user filters' })
  async getSchedules(
    @CurrentUser() user: AuthPayload,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffService.getSchedules(user.tenantId, { userId, from, to });
  }

  @Delete('schedules/:scheduleId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a scheduled shift' })
  async deleteSchedule(
    @CurrentUser() user: AuthPayload,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.staffService.deleteSchedule(user.tenantId, scheduleId);
  }

  // ── Clock In/Out ────────────────────────────────────────────

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for the current shift' })
  async clockIn(@CurrentUser() user: AuthPayload) {
    return this.staffService.clockIn(user.tenantId, user.userId);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out from the current shift' })
  async clockOut(@CurrentUser() user: AuthPayload) {
    return this.staffService.clockOut(user.tenantId, user.userId);
  }

  // ── Performance ─────────────────────────────────────────────

  @Get('performance/:userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get performance metrics for a staff member' })
  async getPerformance(
    @CurrentUser() user: AuthPayload,
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffService.getPerformance(user.tenantId, userId, from, to);
  }
}

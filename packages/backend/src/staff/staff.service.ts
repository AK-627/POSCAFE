import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffScheduleEntity, StaffPerformanceEntity } from './staff.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '@skynether/shared/types/user';

export interface CreateScheduleInput {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  notes?: string;
}

export interface StaffSummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  totalShifts: number;
  totalHoursWorked: number;
  totalOrdersHandled: number;
  totalRevenueGenerated: number;
}

@Injectable()
export class StaffService {

  constructor(
    @InjectRepository(StaffScheduleEntity)
    private readonly scheduleRepository: Repository<StaffScheduleEntity>,
    @InjectRepository(StaffPerformanceEntity)
    private readonly performanceRepository: Repository<StaffPerformanceEntity>,
    private readonly usersService: UsersService,
  ) {}

  // ── Schedule Management ─────────────────────────────────────

  async createSchedule(tenantId: string, input: CreateScheduleInput): Promise<StaffScheduleEntity> {
    // Verify user exists and belongs to tenant
    const user = await this.usersService.findById(input.userId);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('Staff member not found');
    }

    // Check for overlapping shifts
    const existing = await this.scheduleRepository.findOne({
      where: { tenantId, userId: input.userId, date: input.date },
    });
    if (existing) {
      throw new BadRequestException('Staff member already has a shift scheduled for this date');
    }

    const schedule = this.scheduleRepository.create({
      tenantId,
      ...input,
    });

    return this.scheduleRepository.save(schedule);
  }

  async getSchedules(
    tenantId: string,
    options?: { userId?: string; from?: string; to?: string },
  ): Promise<StaffScheduleEntity[]> {
    const query = this.scheduleRepository
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId });

    if (options?.userId) {
      query.andWhere('s.userId = :userId', { userId: options.userId });
    }
    if (options?.from) {
      query.andWhere('s.date >= :from', { from: options.from });
    }
    if (options?.to) {
      query.andWhere('s.date <= :to', { to: options.to });
    }

    return query.orderBy('s.date', 'ASC').addOrderBy('s.startTime', 'ASC').getMany();
  }

  async deleteSchedule(tenantId: string, scheduleId: string): Promise<{ deleted: boolean }> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, tenantId },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.isClockedIn) throw new BadRequestException('Cannot delete a shift that is in progress');

    await this.scheduleRepository.remove(schedule);
    return { deleted: true };
  }

  // ── Clock In/Out ────────────────────────────────────────────

  async clockIn(tenantId: string, userId: string): Promise<StaffScheduleEntity> {
    const today = new Date().toISOString().split('T')[0]!;
    const schedule = await this.scheduleRepository.findOne({
      where: { tenantId, userId, date: today },
    });

    if (!schedule) {
      throw new NotFoundException('No shift scheduled for today');
    }
    if (schedule.isClockedIn) {
      throw new BadRequestException('Already clocked in');
    }

    schedule.isClockedIn = true;
    schedule.clockedInAt = new Date();
    return this.scheduleRepository.save(schedule);
  }

  async clockOut(tenantId: string, userId: string): Promise<StaffScheduleEntity> {
    const today = new Date().toISOString().split('T')[0]!;
    const schedule = await this.scheduleRepository.findOne({
      where: { tenantId, userId, date: today, isClockedIn: true },
    });

    if (!schedule) {
      throw new NotFoundException('No active shift found');
    }

    schedule.isClockedIn = false;
    schedule.clockedOutAt = new Date();

    // Calculate hours worked
    if (schedule.clockedInAt) {
      const ms = new Date().getTime() - new Date(schedule.clockedInAt).getTime();
      schedule.hoursWorked = Number((ms / 3600000).toFixed(2));
    }

    return this.scheduleRepository.save(schedule);
  }

  // ── Performance Tracking ────────────────────────────────────

  async recordPerformance(
    tenantId: string,
    userId: string,
    metrics: Partial<Pick<StaffPerformanceEntity, 'ordersHandled' | 'revenueGenerated' | 'averageOrderTime' | 'itemsPrepared'>>,
  ): Promise<StaffPerformanceEntity> {
    const today = new Date().toISOString().split('T')[0]!;
    let perf = await this.performanceRepository.findOne({
      where: { tenantId, userId, date: today },
    });

    if (perf) {
      if (metrics.ordersHandled) perf.ordersHandled += metrics.ordersHandled;
      if (metrics.revenueGenerated) perf.revenueGenerated = Number(perf.revenueGenerated) + metrics.revenueGenerated;
      if (metrics.itemsPrepared) perf.itemsPrepared += metrics.itemsPrepared;
      if (metrics.averageOrderTime) perf.averageOrderTime = metrics.averageOrderTime;
    } else {
      perf = this.performanceRepository.create({
        tenantId,
        userId,
        date: today,
        ...metrics,
      });
    }

    return this.performanceRepository.save(perf);
  }

  async getPerformance(
    tenantId: string,
    userId: string,
    from?: string,
    to?: string,
  ): Promise<StaffPerformanceEntity[]> {
    const query = this.performanceRepository
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.userId = :userId', { userId });

    if (from) query.andWhere('p.date >= :from', { from });
    if (to) query.andWhere('p.date <= :to', { to });

    return query.orderBy('p.date', 'DESC').getMany();
  }

  // ── Staff Overview ──────────────────────────────────────────

  async getStaffSummary(tenantId: string): Promise<StaffSummary[]> {
    const users = await this.usersService.findByTenant(tenantId);
    const summaries: StaffSummary[] = [];

    for (const user of users) {
      const schedules = await this.scheduleRepository.find({
        where: { tenantId, userId: user.id },
      });
      const performances = await this.performanceRepository.find({
        where: { tenantId, userId: user.id },
      });

      summaries.push({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        totalShifts: schedules.length,
        totalHoursWorked: schedules.reduce((sum, s) => sum + Number(s.hoursWorked), 0),
        totalOrdersHandled: performances.reduce((sum, p) => sum + p.ordersHandled, 0),
        totalRevenueGenerated: performances.reduce((sum, p) => sum + Number(p.revenueGenerated), 0),
      });
    }

    return summaries;
  }
}

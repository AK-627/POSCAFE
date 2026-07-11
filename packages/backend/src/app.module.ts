import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DatabaseModule } from './database/database.module';
import { TenantContextInterceptor } from './database/tenant-context.interceptor';
import configuration, {
  databaseConfig,
  redisConfig,
  jwtConfig,
  rateLimitConfig,
  storageConfig,
  emailConfig,
  syncConfig,
} from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { BillingModule } from './billing/billing.module';
import { CustomersModule } from './customers/customers.module';
import { SyncModule } from './sync/sync.module';
import { StaffModule } from './staff/staff.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionAccessGuard } from './subscriptions/subscription-access.guard';
import { DataExportModule } from './export/data-export.module';
import { PrinterModule } from './printer/printer.module';
import { OfflineModule } from './offline/offline.module';
import { HealthModule } from './health/health.module';
import { TenantsModule } from './tenants/tenants.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration,
        databaseConfig,
        redisConfig,
        jwtConfig,
        rateLimitConfig,
        storageConfig,
        emailConfig,
        syncConfig,
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('rateLimit.ttl') ?? 15,
          limit: config.get<number>('rateLimit.limit') ?? 100,
        },
      ],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Database (to be configured per tenant)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        autoLoadEntities: true,
        synchronize: config.get('app.env') === 'development',
        logging: config.get('database.logging'),
      }),
    }),

    // Redis for caching and sessions
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single' as const,
        url: config.get<string>('redis.url') ?? 'redis://localhost:6379',
      }),
    }),

    // Database & tenant context
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    MenuModule,
    TablesModule,
    OrdersModule,
    KitchenModule,
    BillingModule,
    CustomersModule,
    SyncModule,
    StaffModule,
    ReportsModule,
    AuditModule,
    NotificationsModule,
    SubscriptionsModule,
    DataExportModule,
    PrinterModule,
    OfflineModule,
    HealthModule,
    TenantsModule,
    CommonModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionAccessGuard,
    },
  ],
})
export class AppModule {}

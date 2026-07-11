import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantContextService } from './tenant-context.service';
import { AuthPayload } from '@skynether/shared/types/user';

/**
 * TenantContextInterceptor
 *
 * Automatically sets the PostgreSQL RLS tenant context (`app.current_tenant_id`)
 * for every authenticated request, ensuring Row-Level Security policies are applied.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthPayload }>();
    const user = request.user;

    if (!user?.tenantId) {
      // No authenticated user or no tenantId — let the request pass through
      // (public routes, health checks, etc.)
      return next.handle();
    }

    return from(
      this.tenantContextService.setTenantContext(this.dataSource, user.tenantId),
    ).pipe(switchMap(() => next.handle()));
  }
}

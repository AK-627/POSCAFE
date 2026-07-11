import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from './subscriptions.service';
import { AuthPayload } from '@skynether/shared/types/user';

export const SKIP_SUBSCRIPTION_CHECK = 'skipSubscriptionCheck';

/**
 * SubscriptionAccessGuard
 *
 * Enforces that the tenant's subscription is active (or in trial / grace period)
 * before allowing access to protected routes.
 *
 * Decorate a controller or route with @SkipSubscriptionCheck() to bypass.
 */
@Injectable()
export class SubscriptionAccessGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionAccessGuard.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow bypass for routes decorated with @SkipSubscriptionCheck()
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthPayload }>();
    const user = request.user;

    // Skip check if not authenticated (auth guard handles that separately)
    if (!user?.tenantId) return true;

    const accessible = await this.subscriptionsService.isFeatureAccessible(user.tenantId);
    if (!accessible) {
      this.logger.warn(`Subscription access denied for tenant ${user.tenantId}`);
      throw new ForbiddenException(
        'Your subscription has expired. Please renew to continue using Sky Nether.',
      );
    }

    return true;
  }
}

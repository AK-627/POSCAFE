import { SetMetadata } from '@nestjs/common';
import { SKIP_SUBSCRIPTION_CHECK } from './subscription-access.guard';

/**
 * @SkipSubscriptionCheck()
 *
 * Decorates a controller class or individual route handler to bypass
 * the SubscriptionAccessGuard. Use on public routes and the subscription
 * management endpoints themselves.
 */
export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK, true);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPayload } from '@skynether/shared/types/user';

/**
 * Extracts the authenticated user payload from the request.
 * Usage: @CurrentUser() user: AuthPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthPayload | undefined, ctx: ExecutionContext): AuthPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthPayload;

    if (data) {
      return user[data] as string;
    }

    return user;
  },
);

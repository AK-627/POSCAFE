import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@skynether/shared/types/user';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific user roles.
 * Usage: @Roles(UserRole.OWNER, UserRole.MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

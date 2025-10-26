import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@vibesbnb/shared';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);



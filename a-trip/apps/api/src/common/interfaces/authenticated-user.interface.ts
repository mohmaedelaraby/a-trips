import type { Role } from '../../generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

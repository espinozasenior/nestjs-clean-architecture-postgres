import { Role } from '@domain/shared/enums/role.enum';

export class AuthUser {
  readonly id: string;
  email: string;
  password: string;
  googleId?: string;
  appleId?: string;
  role: Role[];
  currentHashedRefreshToken?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

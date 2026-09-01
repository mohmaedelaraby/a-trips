import type { Role } from '../../../shared/interfaces/api';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  role: Role;
  /** Granular staff permission; null for guests and legacy admins. */
  adminRole: 'SUPER_ADMIN' | 'RESERVATIONS' | 'CONTENT_EDITOR' | null;
  status: 'ACTIVE' | 'BANNED' | 'INVITED' | 'DISABLED';
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: PublicUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
}

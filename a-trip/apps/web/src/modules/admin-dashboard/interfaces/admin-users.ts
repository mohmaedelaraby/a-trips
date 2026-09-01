export type AdminRole = 'SUPER_ADMIN' | 'RESERVATIONS' | 'CONTENT_EDITOR';
export type AdminUserStatus = 'ACTIVE' | 'BANNED' | 'INVITED' | 'DISABLED';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  adminRole: AdminRole | null;
  status: AdminUserStatus;
  invitedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface InviteAdminUserPayload {
  name: string;
  email: string;
  adminRole: AdminRole;
}

export interface UpdateAdminUserPayload {
  name?: string;
  adminRole?: AdminRole;
  status?: AdminUserStatus;
}

export interface Amenity {
  id: string;
  name: string;
  category: string | null;
  hotelCount: number;
}

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super admin',
  RESERVATIONS: 'Reservations',
  CONTENT_EDITOR: 'Content editor',
};

export const ADMIN_ROLE_DESCRIPTION: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Everything, including staff accounts',
  RESERVATIONS: 'Bookings and availability. No hotel content, no staff.',
  CONTENT_EDITOR: 'Hotels, room types and photos. Read-only bookings.',
};

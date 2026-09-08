import type { User } from '../../../generated/prisma/client';

export type PublicUserDto = Omit<User, 'passwordHash' | 'dateOfBirth'> & {
  dateOfBirth: string | null;
};

/**
 * Strips the password hash and renders the birth date as a plain date string.
 *
 * Every path that returns a user to a client goes through here: destructuring
 * `passwordHash` off in one place is what keeps it from leaking the day someone
 * adds a new endpoint and returns the row directly.
 */
export function toPublicUser(user: User): PublicUserDto {
  const { passwordHash: _passwordHash, dateOfBirth, ...rest } = user;
  return { ...rest, dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : null };
}

/** Emails are stored and matched lowercase, so lookups and uniqueness agree. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

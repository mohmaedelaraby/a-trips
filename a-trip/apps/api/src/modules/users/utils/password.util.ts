import * as bcrypt from 'bcryptjs';

/**
 * Cost factor for every password hash in the system.
 *
 * Lives here rather than in a service so the invite placeholder, registration
 * and any future password reset all hash at the same cost — a cheaper hash
 * anywhere weakens the account it protects, and that is easy to miss when the
 * constant is copied.
 */
export const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Constant-time comparison of a candidate password against a stored hash.
 * bcrypt handles the timing safety; callers must still keep their *response*
 * uniform, or an attacker learns which emails exist from the error message.
 */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

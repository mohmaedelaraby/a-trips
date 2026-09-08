import { randomBytes } from 'node:crypto';

/**
 * Filler for an invited account's password column.
 *
 * The row needs a hash before the invitee has chosen anything, and a fixed
 * placeholder would be a shared credential across every pending invite. This is
 * random and never shown to anyone, so the only way into the account is the
 * invite flow.
 */
export function invitePlaceholderPassword(): string {
  return randomBytes(24).toString('hex');
}

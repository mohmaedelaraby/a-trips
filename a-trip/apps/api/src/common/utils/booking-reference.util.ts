import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Human-readable, unambiguous reference, e.g. AT-7KQ4M2P9. */
export function generateBookingReference(): string {
  let body = '';
  for (let i = 0; i < 8; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `AT-${body}`;
}

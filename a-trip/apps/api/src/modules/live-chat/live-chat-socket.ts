import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

/** Every event answers through its acknowledgement in this one shape, so the client never parses a thrown error. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Shared by both gateways: the options that make these real WebSocket
 * connections (no long-polling fallback), and the pieces every handler
 * repeats.
 */
export const gatewayOptions = {
  transports: ['websocket'],
  // Origin is checked against CORS_ORIGIN in LiveChatAuth, where the config
  // is loaded — decorator options are evaluated before .env is read.
  cors: { origin: true, credentials: true },
  // How long a dead tab keeps its room membership before it is dropped.
  pingInterval: 25_000,
  pingTimeout: 20_000,
} as const;

const logger = new Logger('LiveChat');

export interface LiveChatSocketData {
  user?: AuthenticatedUser;
  sent?: number[];
}

export function socketUser(client: Socket): AuthenticatedUser | null {
  return (client.data as LiveChatSocketData).user ?? null;
}

/**
 * Runs a handler and turns its result, or its failure, into an Ack.
 *
 * Handlers can arrive before the async handshake has finished authenticating;
 * those get "not ready" rather than acting as an anonymous user.
 */
export async function respond<T>(
  client: Socket,
  work: (user: AuthenticatedUser) => Promise<T>,
): Promise<Ack<T>> {
  const user = socketUser(client);
  if (!user) return { ok: false, error: 'Still connecting — try again in a moment.' };
  try {
    return { ok: true, data: await work(user) };
  } catch (error) {
    if (error instanceof HttpException) return { ok: false, error: error.message };
    logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sliding window per socket. Sending is the only write a guest can repeat at
 * will, and each one is a database write plus a fan-out to every staff tab.
 */
export function allowSend(client: Socket, limit = 20, windowMs = 30_000): boolean {
  const data = client.data as LiveChatSocketData;
  const now = Date.now();
  data.sent = (data.sent ?? []).filter((at) => now - at < windowMs);
  if (data.sent.length >= limit) return false;
  data.sent.push(now);
  return true;
}

export function tooFast(): HttpException {
  return new HttpException('You are sending messages too quickly. Wait a few seconds.', HttpStatus.TOO_MANY_REQUESTS);
}

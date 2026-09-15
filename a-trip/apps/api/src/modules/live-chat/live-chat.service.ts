import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Server } from 'socket.io';
import { LiveChatRepository } from './repositories/live-chat.repository';
import { Role, SupportConversationStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export const MAX_MESSAGE_LENGTH = 2000;

/** Socket rooms. A guest's room is keyed by user, not socket, so every tab they have open hears a reply. */
export const rooms = {
  user: (userId: string) => `user:${userId}`,
  admins: 'admins',
} as const;

export interface LiveChatMessageDto {
  id: string;
  conversationId: string;
  body: string;
  senderRole: 'USER' | 'ADMIN';
  senderName: string;
  createdAt: string;
}

export interface LiveChatConversationDto {
  id: string;
  status: 'OPEN' | 'CLOSED';
  adminUnread: number;
  userUnread: number;
  lastMessageAt: string;
  user: { id: string; name: string; email: string };
  lastMessage: LiveChatMessageDto | null;
}

type MessageRow = {
  id: string;
  conversationId: string;
  body: string;
  senderRole: Role;
  createdAt: Date;
  sender: { name: string };
};

function toMessage(row: MessageRow): LiveChatMessageDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    senderRole: row.senderRole === Role.ADMIN ? 'ADMIN' : 'USER',
    // Staff sign as "Omar", not "Omar Hassan": a first name reads as a person
    // helping, a full name reads as an audit log.
    senderName: row.senderRole === Role.ADMIN ? row.sender.name.split(' ')[0] : row.sender.name,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * The live-chat rules, independent of transport.
 *
 * Both gateways hand their socket server to this service, because almost
 * every action crosses them: a guest's message has to reach the staff server,
 * a staff reply has to reach the guest server. Keeping the fan-out here means
 * neither gateway needs to know the other exists.
 */
@Injectable()
export class LiveChatService {
  private userServer: Server | null = null;
  private adminServer: Server | null = null;
  /** Authenticated staff sockets; a socket still mid-handshake is not "online". */
  private readonly onlineAdmins = new Set<string>();
  /**
   * One pending write per guest. Two tabs sending at the same instant would
   * otherwise both see "no open thread" and create two, splitting the
   * conversation in the staff inbox.
   */
  private readonly userLocks = new Map<string, Promise<unknown>>();

  constructor(private readonly repository: LiveChatRepository) {}

  attachUserServer(server: Server) {
    this.userServer = server;
  }

  attachAdminServer(server: Server) {
    this.adminServer = server;
  }

  // ---------------------------------------------------------------- presence

  get staffOnline(): boolean {
    return this.onlineAdmins.size > 0;
  }

  adminConnected(socketId: string) {
    const wasOnline = this.staffOnline;
    this.onlineAdmins.add(socketId);
    if (!wasOnline) this.broadcastPresence();
  }

  adminDisconnected(socketId: string) {
    if (!this.onlineAdmins.delete(socketId)) return;
    if (!this.staffOnline) this.broadcastPresence();
  }

  /** Guests see "we usually reply in minutes" vs "leave a message" from this. */
  private broadcastPresence() {
    this.userServer?.emit('chat:presence', { staffOnline: this.staffOnline });
  }

  // ------------------------------------------------------------------ guests

  async userThread(userId: string) {
    const conversation = await this.repository.findOpenForUser(userId);
    if (!conversation) return { conversation: null, messages: [] as LiveChatMessageDto[] };
    const rows = await this.repository.findRecentMessages(conversation.id);
    return {
      conversation: { id: conversation.id, userUnread: conversation.userUnread },
      messages: rows.reverse().map(toMessage),
    };
  }

  sendFromUser(user: AuthenticatedUser, rawBody: string): Promise<LiveChatMessageDto> {
    const body = this.cleanBody(rawBody);
    return this.withUserLock(user.id, async () => {
      const conversation =
        (await this.repository.findOpenForUser(user.id)) ?? (await this.repository.createForUser(user.id));

      const message = toMessage(
        await this.repository.addMessage({
          conversationId: conversation.id,
          senderId: user.id,
          senderRole: Role.USER,
          body,
        }),
      );

      // Every tab the guest has open, including the one that sent it.
      this.userServer?.to(rooms.user(user.id)).emit('chat:message', message);
      await this.pushSummaryToAdmins(conversation.id, message);
      return message;
    });
  }

  async markReadByUser(userId: string) {
    const conversation = await this.repository.findOpenForUser(userId);
    if (!conversation || conversation.userUnread === 0) return;
    await this.repository.clearUnread(conversation.id, 'user');
    await this.pushSummaryToAdmins(conversation.id);
  }

  userTyping(userId: string) {
    return this.repository.findOpenForUser(userId).then((conversation) => {
      if (conversation) {
        this.adminServer?.to(rooms.admins).emit('admin:typing', { conversationId: conversation.id });
      }
    });
  }

  // ------------------------------------------------------------------- staff

  async inbox(): Promise<LiveChatConversationDto[]> {
    const rows = await this.repository.findInbox();
    return rows.map((row) => this.toSummary(row));
  }

  async openForAdmin(conversationId: string) {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.adminUnread > 0) {
      await this.repository.clearUnread(conversationId, 'admin');
      // Other staff watching the inbox see the badge clear too.
      await this.pushSummaryToAdmins(conversationId);
    }

    const rows = await this.repository.findRecentMessages(conversationId);
    return { messages: rows.reverse().map(toMessage) };
  }

  async sendFromAdmin(admin: AuthenticatedUser, conversationId: string, rawBody: string) {
    const body = this.cleanBody(rawBody);
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    // A closed thread is archived. Replying into it would land in a window
    // the guest no longer sees — their next message opens a fresh thread.
    if (conversation.status === SupportConversationStatus.CLOSED) {
      throw new ConflictException('This conversation is closed');
    }

    const message = toMessage(
      await this.repository.addMessage({
        conversationId,
        senderId: admin.id,
        senderRole: Role.ADMIN,
        body,
      }),
    );

    this.userServer?.to(rooms.user(conversation.userId)).emit('chat:message', message);
    // Staff replying clears their own unread for this thread.
    await this.repository.clearUnread(conversationId, 'admin');
    await this.pushSummaryToAdmins(conversationId, message);
    return message;
  }

  async close(conversationId: string) {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === SupportConversationStatus.CLOSED) return;

    await this.repository.close(conversationId);
    this.userServer?.to(rooms.user(conversation.userId)).emit('chat:closed', { conversationId });
    await this.pushSummaryToAdmins(conversationId);
  }

  async adminTyping(conversationId: string) {
    const conversation = await this.repository.findById(conversationId);
    if (conversation?.status === SupportConversationStatus.OPEN) {
      this.userServer?.to(rooms.user(conversation.userId)).emit('chat:typing', {});
    }
  }

  // ----------------------------------------------------------------- helpers

  private cleanBody(raw: unknown): string {
    const body = typeof raw === 'string' ? raw.trim() : '';
    if (!body) throw new BadRequestException('Message is empty');
    if (body.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters`);
    }
    return body;
  }

  /** Re-reads the thread so every staff inbox shows the same counts and preview. */
  private async pushSummaryToAdmins(conversationId: string, message?: LiveChatMessageDto) {
    const row = await this.repository.findSummary(conversationId);
    if (!row) return;
    this.adminServer
      ?.to(rooms.admins)
      .emit('admin:conversation', { conversation: this.toSummary(row), message: message ?? null });
  }

  private toSummary(row: {
    id: string;
    status: SupportConversationStatus;
    adminUnread: number;
    userUnread: number;
    lastMessageAt: Date;
    user: { id: string; name: string; email: string };
    messages: MessageRow[];
  }): LiveChatConversationDto {
    return {
      id: row.id,
      status: row.status === SupportConversationStatus.CLOSED ? 'CLOSED' : 'OPEN',
      adminUnread: row.adminUnread,
      userUnread: row.userUnread,
      lastMessageAt: row.lastMessageAt.toISOString(),
      user: row.user,
      lastMessage: row.messages[0] ? toMessage(row.messages[0]) : null,
    };
  }

  private async withUserLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.userLocks.get(userId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    this.userLocks.set(userId, run);
    try {
      return await run;
    } finally {
      // Only drop the entry if nothing queued behind this one.
      if (this.userLocks.get(userId) === run) this.userLocks.delete(userId);
    }
  }
}

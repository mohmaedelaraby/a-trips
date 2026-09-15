import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role, SupportConversationStatus } from '../../../generated/prisma/enums';

/** How much of a thread one open loads. Older history is not paged in yet. */
export const MESSAGE_PAGE = 100;
/** Rows in the staff inbox. */
const INBOX_LIMIT = 100;

const messageInclude = { sender: { select: { name: true } } } as const;

const conversationSummaryInclude = {
  user: { select: { id: true, name: true, email: true } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: messageInclude,
  },
} as const;

@Injectable()
export class LiveChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOpenForUser(userId: string) {
    return this.prisma.supportConversation.findFirst({
      where: { userId, status: SupportConversationStatus.OPEN },
      orderBy: { createdAt: 'desc' },
    });
  }

  createForUser(userId: string) {
    return this.prisma.supportConversation.create({ data: { userId } });
  }

  findById(id: string) {
    return this.prisma.supportConversation.findUnique({ where: { id } });
  }

  findSummary(id: string) {
    return this.prisma.supportConversation.findUnique({
      where: { id },
      include: conversationSummaryInclude,
    });
  }

  /** Newest first from the database, reversed by the caller into reading order. */
  findRecentMessages(conversationId: string) {
    return this.prisma.supportMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE,
      include: messageInclude,
    });
  }

  /**
   * Writes the message and moves the thread's counters in one transaction, so
   * an unread badge can never disagree with the messages actually stored.
   */
  addMessage(input: { conversationId: string; senderId: string; senderRole: Role; body: string }) {
    const counter = input.senderRole === Role.ADMIN ? 'userUnread' : 'adminUnread';
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.supportMessage.create({
        data: input,
        include: messageInclude,
      });
      await tx.supportConversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: message.createdAt, [counter]: { increment: 1 } },
      });
      return message;
    });
  }

  clearUnread(conversationId: string, side: 'admin' | 'user') {
    return this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: side === 'admin' ? { adminUnread: 0 } : { userUnread: 0 },
    });
  }

  close(conversationId: string) {
    return this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: { status: SupportConversationStatus.CLOSED, adminUnread: 0 },
    });
  }

  /** Open threads first, each group newest activity first. */
  findInbox() {
    return this.prisma.supportConversation.findMany({
      orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
      take: INBOX_LIMIT,
      include: conversationSummaryInclude,
    });
  }
}

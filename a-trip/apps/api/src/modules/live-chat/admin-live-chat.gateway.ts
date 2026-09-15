import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { LiveChatAuth } from './live-chat-auth';
import { LiveChatService, rooms } from './live-chat.service';
import { allowSend, gatewayOptions, respond, tooFast, type LiveChatSocketData } from './live-chat-socket';

type ConversationPayload = { conversationId?: unknown };

function conversationId(payload: ConversationPayload | undefined): string {
  return typeof payload?.conversationId === 'string' ? payload.conversationId : '';
}

/**
 * The staff inbox side of live chat.
 *
 * Under /api/admin so the handshake carries the admin-scoped cookie, and the
 * connection is refused outright for anyone without the ADMIN role — there is
 * no per-event role check because an unauthorized socket never gets this far.
 */
@WebSocketGateway({ ...gatewayOptions, path: '/api/admin/live-chat' })
export class AdminLiveChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly auth: LiveChatAuth,
    private readonly chat: LiveChatService,
  ) {}

  afterInit(server: Server) {
    this.chat.attachAdminServer(server);
  }

  async handleConnection(client: Socket) {
    const admin = await this.auth.authenticate(client, 'admin');
    if (!admin) {
      client.emit('chat:unauthorized');
      client.disconnect(true);
      return;
    }

    (client.data as LiveChatSocketData).user = admin;
    await client.join(rooms.admins);
    this.chat.adminConnected(client.id);
    client.emit('admin:ready', {});
  }

  handleDisconnect(client: Socket) {
    this.chat.adminDisconnected(client.id);
  }

  @SubscribeMessage('admin:inbox')
  inbox(@ConnectedSocket() client: Socket) {
    return respond(client, () => this.chat.inbox());
  }

  @SubscribeMessage('admin:open')
  open(@ConnectedSocket() client: Socket, @MessageBody() payload: ConversationPayload) {
    return respond(client, () => this.chat.openForAdmin(conversationId(payload)));
  }

  @SubscribeMessage('admin:send')
  send(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ConversationPayload & { body?: unknown },
  ) {
    return respond(client, async (admin) => {
      if (!allowSend(client, 60)) throw tooFast();
      return this.chat.sendFromAdmin(admin, conversationId(payload), payload?.body as string);
    });
  }

  @SubscribeMessage('admin:close')
  close(@ConnectedSocket() client: Socket, @MessageBody() payload: ConversationPayload) {
    return respond(client, () => this.chat.close(conversationId(payload)));
  }

  @SubscribeMessage('admin:typing')
  typing(@ConnectedSocket() client: Socket, @MessageBody() payload: ConversationPayload) {
    return respond(client, () => this.chat.adminTyping(conversationId(payload)));
  }
}

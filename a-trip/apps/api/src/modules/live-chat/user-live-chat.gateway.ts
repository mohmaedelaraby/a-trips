import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { LiveChatAuth } from './live-chat-auth';
import { LiveChatService, rooms } from './live-chat.service';
import { allowSend, gatewayOptions, respond, tooFast, type LiveChatSocketData } from './live-chat-socket';

/**
 * The guest side of live chat.
 *
 * Mounted under /api — not /api/admin — so the browser attaches the guest
 * session cookie to the handshake and never the staff one. An admin browsing
 * the public site in another tab is therefore still a guest here.
 */
@WebSocketGateway({ ...gatewayOptions, path: '/api/live-chat' })
export class UserLiveChatGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    private readonly auth: LiveChatAuth,
    private readonly chat: LiveChatService,
  ) {}

  afterInit(server: Server) {
    this.chat.attachUserServer(server);
  }

  async handleConnection(client: Socket) {
    const user = await this.auth.authenticate(client, 'user');
    if (!user) {
      // Told why before being dropped, so the client can show "sign in to
      // chat" instead of retrying a connection that will never be accepted.
      client.emit('chat:unauthorized');
      client.disconnect(true);
      return;
    }

    (client.data as LiveChatSocketData).user = user;
    await client.join(rooms.user(user.id));
    client.emit('chat:ready', { staffOnline: this.chat.staffOnline });
  }

  @SubscribeMessage('chat:history')
  history(@ConnectedSocket() client: Socket) {
    return respond(client, (user) => this.chat.userThread(user.id));
  }

  @SubscribeMessage('chat:send')
  send(@ConnectedSocket() client: Socket, @MessageBody() payload: { body?: unknown }) {
    return respond(client, async (user) => {
      if (!allowSend(client)) throw tooFast();
      return this.chat.sendFromUser(user, payload?.body as string);
    });
  }

  @SubscribeMessage('chat:read')
  read(@ConnectedSocket() client: Socket) {
    return respond(client, (user) => this.chat.markReadByUser(user.id));
  }

  @SubscribeMessage('chat:typing')
  typing(@ConnectedSocket() client: Socket) {
    return respond(client, (user) => this.chat.userTyping(user.id));
  }
}

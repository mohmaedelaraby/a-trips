import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { LiveChatAuth } from './live-chat-auth';
import { LiveChatService } from './live-chat.service';
import { LiveChatRepository } from './repositories/live-chat.repository';
import { UserLiveChatGateway } from './user-live-chat.gateway';
import { AdminLiveChatGateway } from './admin-live-chat.gateway';

@Module({
  // AuthModule for JwtService, UsersModule for the account-status check —
  // the same two things JwtStrategy relies on for HTTP requests.
  imports: [AuthModule, UsersModule],
  providers: [
    LiveChatAuth,
    LiveChatService,
    LiveChatRepository,
    UserLiveChatGateway,
    AdminLiveChatGateway,
  ],
})
export class LiveChatModule {}

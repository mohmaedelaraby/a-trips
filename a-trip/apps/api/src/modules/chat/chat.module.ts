import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { ChatController } from './chat.controller';
import { ChatRepository } from './repositories/chat.repository';

@Module({
  providers: [ChatService, LlmService, ChatRepository],
  controllers: [ChatController],
})
export class ChatModule {}

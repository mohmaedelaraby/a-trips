import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { ChatRequestDto } from './dto/chat.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Whether the assistant is wired up at all. The widget asks first and hides
   * itself when the answer is no, the same way the checkout does with PayPal
   * — a help button that errors on click is worse than no help button.
   */
  @Public()
  @Get('config')
  config() {
    return { configured: this.chat.configured, model: this.chat.configured ? this.llm.model : null };
  }

  /**
   * Public on purpose: the point is answering questions from visitors who
   * have not signed up. The spend that opens up is capped per IP inside the
   * service.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post()
  send(@Body() dto: ChatRequestDto, @Req() req: Request) {
    return this.chat.reply(dto, clientKey(req));
  }
}

/**
 * Identity for rate limiting. `req.ip` already honours the proxy chain when
 * Express is told to trust one; the socket address is the fallback for a
 * direct connection.
 */
function clientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

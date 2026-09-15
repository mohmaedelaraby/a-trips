import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Per-event logging on a chat socket would drown the request log.
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();
    return next
      .handle()
      .pipe(tap(() => this.logger.log(`${req.method} ${req.url} ${Date.now() - startedAt}ms`)));
  }
}

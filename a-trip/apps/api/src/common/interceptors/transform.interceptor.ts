import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    // The envelope is the REST contract. A WebSocket handler's return value is
    // the event's acknowledgement, which the socket client reads as-is.
    if (context.getType() !== 'http') return next.handle() as unknown as Observable<ApiEnvelope<T>>;
    return next.handle().pipe(map((data) => ({ success: true as const, data })));
  }
}

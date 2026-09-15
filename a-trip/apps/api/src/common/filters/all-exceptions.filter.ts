import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface NestValidationBody {
  message?: string | string[];
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Also registered for WebSocket gateways, which have no response object to
    // call .status() on. Report the failure on the socket instead of crashing.
    if (host.getType() === 'ws') {
      const client = host.switchToWs().getClient<{ emit: (event: string, data: unknown) => void }>();
      const message =
        exception instanceof HttpException
          ? exception.message
          : 'Something went wrong';
      if (!(exception instanceof HttpException)) {
        this.logger.error(exception instanceof Error ? exception.message : String(exception));
      }
      client.emit('exception', { message });
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const parsed = body as NestValidationBody;
        if (Array.isArray(parsed.message)) {
          message = 'Validation failed';
          errors = { _: parsed.message };
        } else {
          message = parsed.message ?? parsed.error ?? exception.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

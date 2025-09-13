import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { handleError } from '../utils/response.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract original response body if HttpException
    let original: unknown = null;
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      original = res;
      // Some Nest built-ins return object with statusCode & message | messages array
      if (typeof res === 'object' && res) {
        const mutable: Record<string, unknown> = res as Record<string, unknown>;
        if (Array.isArray(mutable.message)) {
          mutable.message = (mutable.message as unknown[])
            .map((m) => String(m))
            .join('; ');
        }
      }
    }

    let message: string = 'Internal server error';
    if (original && typeof original === 'object') {
      const o = original as Record<string, unknown>;
      const candidate = (o.message as string) || (o.error as string);
      if (typeof candidate === 'string' && candidate.trim().length) {
        message = candidate;
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof (exception as { message?: unknown }).message === 'string'
    ) {
      message = (exception as { message: string }).message;
    }

    // Derive code: use uppercase snake-like of message first word, else GENERIC_ERROR
    const code =
      typeof message === 'string'
        ? message
            .split(' ')[0]
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase() || 'ERROR'
        : 'ERROR';

    const payload = handleError({
      code,
      message,
      error: {
        path: request.url,
        method: request.method,
        detail: original,
      },
      statusCode: status,
    });

    response.status(status).json(payload);
  }
}

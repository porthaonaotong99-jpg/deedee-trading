import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog } from '../../modules/audit-logs/entities/audit-log.entity';
import { AuditLogStatus } from '../enums';
import type { JwtPayload } from '../interfaces';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user, method, url } = request;

    const action = `${method} ${url}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Don't await here - let it run in background
        this.createAuditLog({
          action,
          description: `${action} completed successfully in ${duration}ms`,
          status: AuditLogStatus.SUCCESS,
          on_success: `Request processed successfully. Response: ${JSON.stringify(response).substring(0, 500)}`,
          user_id: user?.type === 'user' ? user.sub : undefined,
          customer_id: user?.type === 'customer' ? user.sub : undefined,
        }).catch(console.error);
      }),
      catchError((error: unknown) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorStack =
          error instanceof Error
            ? error.stack?.substring(0, 500)
            : 'No stack trace';

        // Don't await here - let it run in background
        this.createAuditLog({
          action,
          description: `${action} failed after ${duration}ms`,
          status: AuditLogStatus.FAILED,
          on_error: `Request failed with error: ${errorMessage}. Stack: ${errorStack}`,
          user_id: user?.type === 'user' ? user.sub : undefined,
          customer_id: user?.type === 'customer' ? user.sub : undefined,
        }).catch(console.error);

        return throwError(() => error);
      }),
    );
  }

  private async createAuditLog(logData: {
    action: string;
    description: string;
    status: AuditLogStatus;
    on_success?: string;
    on_error?: string;
    user_id?: string;
    customer_id?: string;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(logData);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Don't throw error here to avoid disrupting the main request
      console.error('Failed to create audit log:', error);
    }
  }
}

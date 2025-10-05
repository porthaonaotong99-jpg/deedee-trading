import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentAuditLog,
  PaymentAuditAction,
  PaymentAuditLevel,
} from '../entities/payment-audit-log.entity';

export interface CreatePaymentAuditLogDto {
  payment_id: string;
  customer_id: string;
  action: PaymentAuditAction;
  level?: PaymentAuditLevel;
  description: string;
  metadata?: Record<string, unknown>;
  user_agent?: string;
  ip_address?: string;
  performed_by?: string;
  external_reference?: string;
}

export interface PaymentAuditContext {
  user_agent?: string;
  ip_address?: string;
  performed_by?: string;
  external_reference?: string;
}

@Injectable()
export class PaymentAuditService {
  constructor(
    @InjectRepository(PaymentAuditLog)
    private readonly auditRepo: Repository<PaymentAuditLog>,
  ) {}

  async logPaymentAction(
    paymentId: string,
    customerId: string,
    action: PaymentAuditAction,
    description: string,
    options?: {
      level?: PaymentAuditLevel;
      metadata?: Record<string, unknown>;
      context?: PaymentAuditContext;
    },
  ): Promise<PaymentAuditLog> {
    const auditLog = this.auditRepo.create({
      payment_id: paymentId,
      customer_id: customerId,
      action,
      level: options?.level || PaymentAuditLevel.INFO,
      description,
      metadata: options?.metadata || null,
      user_agent: options?.context?.user_agent || null,
      ip_address: options?.context?.ip_address || null,
      performed_by: options?.context?.performed_by || null,
      external_reference: options?.context?.external_reference || null,
    });
    return this.auditRepo.save(auditLog);
  }

  async logPaymentCreated(
    paymentId: string,
    customerId: string,
    metadata?: Record<string, unknown>,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_CREATED,
      'Payment record created in the system',
      { metadata, context },
    );
  }

  async logPaymentInitiated(
    paymentId: string,
    customerId: string,
    paymentUrl: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_INITIATED,
      'Payment process initiated with payment provider',
      { metadata: { payment_url: paymentUrl }, context },
    );
  }

  async logPaymentUrlGenerated(
    paymentId: string,
    customerId: string,
    paymentUrl: string,
    expiresAt: Date,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_URL_GENERATED,
      'Payment URL generated and ready for customer',
      {
        metadata: {
          payment_url: paymentUrl,
          expires_at: expiresAt.toISOString(),
        },
        context,
      },
    );
  }

  async logPaymentSucceeded(
    paymentId: string,
    customerId: string,
    amount: number,
    currency: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_SUCCEEDED,
      'Payment completed successfully',
      { metadata: { amount, currency }, context },
    );
  }

  async logPaymentFailed(
    paymentId: string,
    customerId: string,
    failureReason: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_FAILED,
      `Payment failed: ${failureReason}`,
      {
        level: PaymentAuditLevel.ERROR,
        metadata: { failure_reason: failureReason },
        context,
      },
    );
  }

  async logPaymentCanceled(
    paymentId: string,
    customerId: string,
    reason?: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_CANCELED,
      `Payment canceled${reason ? ': ' + reason : ''}`,
      {
        level: PaymentAuditLevel.WARNING,
        metadata: reason ? { cancel_reason: reason } : undefined,
        context,
      },
    );
  }

  async logPaymentRefunded(
    paymentId: string,
    customerId: string,
    refundAmount: number,
    refundReason?: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.PAYMENT_REFUNDED,
      `Payment refunded: ${refundAmount}`,
      {
        level: PaymentAuditLevel.WARNING,
        metadata: { refund_amount: refundAmount, refund_reason: refundReason },
        context,
      },
    );
  }

  async logSubscriptionActivated(
    paymentId: string,
    customerId: string,
    serviceType: string,
    expiresAt?: Date,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.SUBSCRIPTION_ACTIVATED,
      `Subscription activated for service: ${serviceType}`,
      {
        metadata: {
          service_type: serviceType,
          expires_at: expiresAt?.toISOString(),
        },
        context,
      },
    );
  }

  async logAdminApprovalPending(
    paymentId: string,
    customerId: string,
    serviceType: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.ADMIN_APPROVAL_PENDING,
      `Subscription pending admin approval for service: ${serviceType}`,
      {
        level: PaymentAuditLevel.WARNING,
        metadata: { service_type: serviceType },
        context,
      },
    );
  }

  async logAdminApproved(
    paymentId: string,
    customerId: string,
    serviceType: string,
    adminUserId: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.ADMIN_APPROVED,
      `Subscription approved by admin for service: ${serviceType}`,
      {
        metadata: { service_type: serviceType },
        context: { ...context, performed_by: adminUserId },
      },
    );
  }

  async logAdminRejected(
    paymentId: string,
    customerId: string,
    serviceType: string,
    adminUserId: string,
    rejectionReason?: string,
    context?: PaymentAuditContext,
  ): Promise<void> {
    await this.logPaymentAction(
      paymentId,
      customerId,
      PaymentAuditAction.ADMIN_REJECTED,
      `Subscription rejected by admin for service: ${serviceType}${rejectionReason ? ': ' + rejectionReason : ''}`,
      {
        level: PaymentAuditLevel.ERROR,
        metadata: {
          service_type: serviceType,
          rejection_reason: rejectionReason,
        },
        context: { ...context, performed_by: adminUserId },
      },
    );
  }

  async getPaymentAuditLogs(
    paymentId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: PaymentAuditAction;
      level?: PaymentAuditLevel;
    },
  ): Promise<{ logs: PaymentAuditLog[]; total: number }> {
    const queryBuilder = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.payment_id = :paymentId', { paymentId });
    if (options?.action) {
      queryBuilder.andWhere('audit.action = :action', {
        action: options.action,
      });
    }
    if (options?.level) {
      queryBuilder.andWhere('audit.level = :level', { level: options.level });
    }
    queryBuilder
      .orderBy('audit.created_at', 'DESC')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
    const [logs, total] = await queryBuilder.getManyAndCount();
    return { logs, total };
  }

  async getCustomerPaymentAuditLogs(
    customerId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: PaymentAuditAction;
      level?: PaymentAuditLevel;
    },
  ): Promise<{ logs: PaymentAuditLog[]; total: number }> {
    const queryBuilder = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.payment', 'payment')
      .where('audit.customer_id = :customerId', { customerId });
    if (options?.action) {
      queryBuilder.andWhere('audit.action = :action', {
        action: options.action,
      });
    }
    if (options?.level) {
      queryBuilder.andWhere('audit.level = :level', { level: options.level });
    }
    queryBuilder
      .orderBy('audit.created_at', 'DESC')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
    const [logs, total] = await queryBuilder.getManyAndCount();
    return { logs, total };
  }
}

export { PaymentAuditAction, PaymentAuditLevel };

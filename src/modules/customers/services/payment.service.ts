import { Injectable } from '@nestjs/common';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  payment_url: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  expires_at: Date;
  metadata?: Record<string, any>;
}

export interface PaymentProvider {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<PaymentIntent>;

  confirmPayment(paymentIntentId: string): Promise<PaymentIntent>;

  cancelPayment(paymentIntentId: string): Promise<PaymentIntent>;
}

@Injectable()
export class MockPaymentService implements PaymentProvider {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<PaymentIntent> {
    // Mock implementation - replace with actual payment provider (Stripe, PayPal, etc.)
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return Promise.resolve({
      id: paymentId,
      amount: params.amount,
      currency: params.currency,
      payment_url: `https://payment-gateway.example.com/pay/${paymentId}`,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      metadata: params.metadata,
    });
  }

  confirmPayment(paymentIntentId: string): Promise<PaymentIntent> {
    // Mock implementation
    return Promise.resolve({
      id: paymentIntentId,
      amount: 0,
      currency: 'USD',
      payment_url: '',
      status: 'succeeded',
      expires_at: new Date(),
    });
  }

  cancelPayment(paymentIntentId: string): Promise<PaymentIntent> {
    // Mock implementation
    return Promise.resolve({
      id: paymentIntentId,
      amount: 0,
      currency: 'USD',
      payment_url: '',
      status: 'canceled',
      expires_at: new Date(),
    });
  }
}

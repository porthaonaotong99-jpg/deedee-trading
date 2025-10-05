import { Injectable } from '@nestjs/common';
import {
  PaymentIntent,
  PaymentProvider,
  MockPaymentService,
} from '../../customers/services/payment.service';

// For now re-export the existing mock implementation. Later can replace with real provider (Stripe, etc.)
@Injectable()
export class PaymentService extends MockPaymentService {}

export type { PaymentIntent, PaymentProvider };

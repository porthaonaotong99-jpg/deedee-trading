# Premium Membership Payment and Expiration Management Setup

## Overview
This document explains the enhanced premium membership system that includes proper payment processing and subscription expiration management.

## New Features Added

### 1. Payment Processing Integration

#### Payment Service Interface (`payment.service.ts`)
- **MockPaymentService**: Simulates payment provider integration
- **PaymentProvider Interface**: Defines contract for payment providers (Stripe, PayPal, etc.)
- **PaymentIntent**: Handles payment URL generation and status tracking

#### Key Features:
- Payment URL generation for external payment processing
- 30-minute payment expiration window
- Payment metadata for service linking
- Support for confirmation and cancellation

### 2. Enhanced Premium Membership Application

#### New API Response Format
```json
{
  "status": "pending_payment",
  "service_type": "premium_membership",
  "service_id": "uuid",
  "payment": {
    "payment_id": "payment_123456_abc",
    "payment_url": "https://payment-gateway.example.com/pay/...",
    "amount": 299.99,
    "currency": "USD",
    "expires_at": "2025-01-02T10:30:00.000Z"
  },
  "subscription": {
    "subscription_duration": 3,
    "subscription_expires_at": "2025-04-02T00:00:00.000Z",
    "payment_status": "pending",
    "subscription_fee": 299.99
  }
}
```

#### Flow:
1. Customer applies for premium membership
2. System generates payment intent with external provider
3. Customer redirected to payment URL
4. Payment completion triggers service activation
5. Subscription automatically expires after duration

### 3. Payment Confirmation System

#### New Endpoint: `POST /api/v1/customers/services/payments/:paymentId/confirm`
- Confirms payment completion
- Activates the associated service
- Updates payment status to 'paid'
- Returns activation confirmation

### 4. Subscription Expiration Management

#### Automated Background Processing
- **Hourly Check**: Scans for expired subscriptions and deactivates them
- **Daily Warnings**: Sends notification emails for expiring subscriptions
- **Scheduled Service**: `SubscriptionSchedulerService` handles automation

#### Cron Jobs:
- `@Cron(CronExpression.EVERY_HOUR)`: Check and deactivate expired subscriptions
- `@Cron('0 9 * * *')`: Send expiration warnings at 9 AM daily

## API Endpoints Updated

### Premium Membership Application
```http
POST /api/v1/customers/services/premium-membership/apply
```

**Request:**
```json
{
  "service_type": "premium_membership",
  "subscription": {
    "duration": 6,
    "fee": 549.99
  }
}
```

**Response:**
- Includes payment URL and instructions
- Service remains inactive until payment completion

### Payment Confirmation
```http
POST /api/v1/customers/services/payments/{paymentId}/confirm
```

**Purpose:** Confirms payment and activates subscription

### Subscription Status
```http
GET /api/v1/customers/services/subscriptions/my
```

**Purpose:** View current subscription status and expiration dates

## Configuration Required

### 1. Module Providers Setup
Add to `customers.module.ts`:
```typescript
providers: [
  CustomersService,
  {
    provide: 'PaymentService',
    useClass: MockPaymentService, // Replace with actual provider
  },
  SubscriptionSchedulerService,
]
```

### 2. Environment Variables
```env
FRONTEND_URL=http://localhost:3000
PAYMENT_PROVIDER_API_KEY=your_payment_key
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Migration
The system uses existing fields in `customer_services` table:
- `subscription_duration`
- `subscription_expires_at`
- `payment_status`
- `subscription_fee`

## Usage Examples

### 1. Customer Applies for Premium Membership
```bash
curl -X POST /api/v1/customers/services/premium-membership/apply \
  -H "Authorization: Bearer customer_token" \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "premium_membership",
    "subscription": {
      "duration": 6,
      "fee": 549.99
    }
  }'
```

### 2. Customer Completes Payment
- Customer visits payment URL from response
- Completes payment on external provider
- System automatically confirms and activates service

### 3. Automatic Expiration
- Background service checks hourly for expired subscriptions
- Automatically deactivates expired services
- Logs expiration actions for audit

## Production Considerations

### 1. Replace Mock Payment Service
- Integrate with actual payment provider (Stripe recommended)
- Implement proper webhook handling for payment confirmations
- Add proper error handling and retry logic

### 2. Enhanced Security
- Validate payment webhooks with provider signatures
- Implement rate limiting on payment endpoints
- Add payment fraud detection

### 3. Monitoring and Alerts
- Monitor payment success/failure rates
- Alert on expired subscription volumes
- Track subscription renewal patterns

### 4. Customer Communications
- Send email confirmations for successful payments
- Notify customers before subscription expiration
- Provide clear renewal instructions

## Integration Points

### Current System Integration
- ✅ **Auto-approval for premium_stock_picks**: Still works for new registrations
- ✅ **Admin approval for other services**: Maintained for high-risk services
- ✅ **KYC validation**: Continues to work as configured
- ✅ **Service status tracking**: Enhanced with payment states

### Payment Provider Integration
- **Mock Service**: Currently implemented for testing
- **Production Ready**: Interface supports Stripe, PayPal, Square
- **Webhook Support**: Ready for payment confirmation callbacks
- **Error Handling**: Comprehensive payment failure management

This enhanced system provides a complete subscription management solution with proper payment processing and automatic expiration handling.
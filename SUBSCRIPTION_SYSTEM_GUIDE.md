# Premium Membership Subscription System

This document explains the new subscription system implemented for DeeDee Trading platform, focusing on the Premium Membership service with automatic Premium Stock Picks activation.

## Overview

The subscription system supports:
- **Automatic Service Assignment**: New customers automatically get `premium_stock_picks` service activated
- **Premium Membership Subscriptions**: 3, 6, and 12-month packages with payment requirements
- **Subscription Management**: View status, renewals, and expiration tracking
- **Payment Integration**: Ready for payment gateway integration

## Features

### 1. Automatic Service Assignment

When a customer registers:
- `premium_stock_picks` service is automatically applied and activated
- No payment required for this basic service
- Provides immediate value to new customers

### 2. Premium Membership Subscription

Premium membership offers:
- **3-month package**: $299.99
- **6-month package**: $549.99 (most popular)
- **12-month package**: $999.99 (best value)

Key characteristics:
- Requires manual payment before activation
- Requires admin approval after payment
- Time-limited access (expires based on package duration)
- Automatic deactivation if not renewed after expiration

### 3. Service Configuration

Services are configured with different requirements:

```typescript
const serviceConfig = {
  PREMIUM_MEMBERSHIP: {
    level: KycLevel.BASIC,
    requiresPayment: true,
    requiresAdminApproval: true,
    subscriptionBased: true,
  },
  PREMIUM_STOCK_PICKS: {
    level: KycLevel.BASIC,
    requiresPayment: false,
    requiresAdminApproval: false,
    subscriptionBased: false,
  },
  // ... other services
};
```

## API Endpoints

### Customer Registration
```http
POST /auth/customer/register
```
Automatically applies `premium_stock_picks` service.

### Apply for Premium Membership
```http
POST /customers/services/premium-membership/apply
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "service_type": "premium_membership",
  "subscription": {
    "duration": 6,
    "fee": 549.99
  }
}
```

### View Subscription Status
```http
GET /customers/services/subscriptions/my
Authorization: Bearer <customer_token>
```

### General Service Application
```http
POST /customers/services/apply
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "service_type": "premium_membership",
  "subscription": {
    "duration": 3,
    "fee": 299.99
  }
}
```

## Subscription Lifecycle

### 1. Application Phase
- Customer applies for premium membership
- System creates service record with `active: false`
- Payment status set to `pending`
- Subscription expiration calculated but not active

### 2. Payment Phase
- Customer completes payment (external payment gateway)
- Admin receives payment confirmation
- Payment status updated to `paid`

### 3. Approval Phase
- Admin reviews and approves the subscription
- Service status set to `active: true`
- Customer gains access to premium features

### 4. Active Phase
- Customer has full access to premium membership features
- System tracks expiration date
- Notifications sent before expiration (future feature)

### 5. Expiration Phase
- Service automatically deactivated after expiration
- Customer loses access to premium features
- Renewal options presented

## Database Schema

### customer_services table
```sql
CREATE TABLE customer_services (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  service_type ENUM('premium_membership', 'premium_stock_picks', ...) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  requires_payment BOOLEAN DEFAULT FALSE,
  subscription_duration INTEGER NULL, -- 3, 6, or 12 months
  subscription_expires_at TIMESTAMP NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  subscription_fee DECIMAL(10,2) NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### Common Error Scenarios

1. **Duplicate Application**
   ```json
   {
     "statusCode": 409,
     "message": "Customer already has active premium membership",
     "error": "Conflict"
   }
   ```

2. **Invalid Subscription Duration**
   ```json
   {
     "statusCode": 400,
     "message": "Subscription duration must be 3, 6, or 12 months",
     "error": "Bad Request"
   }
   ```

3. **Insufficient KYC Level**
   ```json
   {
     "statusCode": 400,
     "message": "KYC level BASIC required for this service",
     "error": "Bad Request"
   }
   ```

## Security Considerations

1. **Authorization**: All subscription endpoints require customer authentication
2. **Rate Limiting**: Prevent abuse of application endpoints
3. **Input Validation**: Strict validation of subscription parameters
4. **Payment Security**: Integration with secure payment gateways
5. **Admin Approval**: Manual review prevents fraudulent activations

## Monitoring and Analytics

### Key Metrics to Track

1. **Conversion Rates**
   - Registration to premium membership conversion
   - Package selection distribution (3/6/12 months)

2. **Revenue Metrics**
   - Monthly recurring revenue (MRR)
   - Customer lifetime value (CLV)
   - Average revenue per user (ARPU)

3. **Customer Behavior**
   - Time to subscription after registration
   - Renewal rates by package type
   - Churn analysis

### Database Queries for Analytics

```sql
-- Monthly subscription revenue
SELECT 
  DATE_TRUNC('month', applied_at) as month,
  SUM(subscription_fee) as total_revenue,
  COUNT(*) as total_subscriptions
FROM customer_services 
WHERE service_type = 'premium_membership' 
  AND payment_status = 'paid'
GROUP BY month
ORDER BY month DESC;

-- Package popularity
SELECT 
  subscription_duration,
  COUNT(*) as count,
  AVG(subscription_fee) as avg_fee
FROM customer_services 
WHERE service_type = 'premium_membership'
GROUP BY subscription_duration;

-- Expiring subscriptions (next 30 days)
SELECT 
  customer_id,
  subscription_expires_at,
  subscription_duration,
  subscription_fee
FROM customer_services 
WHERE service_type = 'premium_membership'
  AND active = true
  AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';
```

## Future Enhancements

### Phase 2 Features

1. **Automatic Renewals**
   - Saved payment methods
   - Auto-renewal before expiration
   - Grace period for failed payments

2. **Subscription Management**
   - Customer-initiated cancellations
   - Refund processing
   - Downgrade/upgrade options

3. **Marketing Features**
   - Promotional pricing
   - Discount codes
   - Referral bonuses

4. **Advanced Analytics**
   - Churn prediction
   - Personalized renewal offers
   - Usage-based recommendations

### Integration Points

1. **Payment Gateways**
   - Stripe integration
   - PayPal support
   - Local payment methods

2. **Communication**
   - Email notifications for expiration
   - SMS alerts for payment failures
   - In-app renewal reminders

3. **Customer Support**
   - Subscription status in support dashboard
   - Billing history access
   - Prorated refund calculations

## Testing

### Test Scenarios

1. **Registration Flow**
   - Verify automatic premium_stock_picks assignment
   - Check service activation status

2. **Subscription Application**
   - Test all package durations (3, 6, 12 months)
   - Verify fee calculations
   - Check payment status initialization

3. **Payment Processing**
   - Mock payment confirmation
   - Test payment failure scenarios
   - Verify status transitions

4. **Expiration Handling**
   - Test service deactivation after expiration
   - Verify renewal capabilities
   - Check grace period behavior

### Sample Test Data

```javascript
// Test customer registration
const newCustomer = {
  username: "testuser123",
  email: "test@example.com",
  password: "SecurePass123!",
  first_name: "John",
  last_name: "Doe"
};

// Test premium membership application
const premiumMembershipRequest = {
  service_type: "premium_membership",
  subscription: {
    duration: 6,
    fee: 549.99
  }
};
```

## Conclusion

The subscription system provides a solid foundation for monetizing premium features while ensuring customers receive immediate value through automatic premium stock picks activation. The flexible architecture supports various subscription models and can be extended for future business requirements.
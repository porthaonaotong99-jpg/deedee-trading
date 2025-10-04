# Service Approval Configuration

## Overview
This document explains how different customer services are configured for approval in the trading platform.

## Service Types and Approval Requirements

### 1. PREMIUM_STOCK_PICKS
- **Auto-Approval**: ✅ YES (Only this service)
- **KYC Required**: ❌ NO (bypassed for auto-approval)
- **Admin Approval**: ❌ NO
- **Payment Required**: ❌ NO
- **Subscription Based**: ❌ NO
- **Status After Application**: `activated` (immediately active)

**Use Case**: Automatically assigned during customer registration for immediate access to premium stock picks.

### 2. PREMIUM_MEMBERSHIP
- **Auto-Approval**: ❌ NO
- **KYC Required**: ✅ YES (Basic level)
- **Admin Approval**: ✅ YES
- **Payment Required**: ✅ YES
- **Subscription Based**: ✅ YES (3/6/12 months)
- **Status After Application**: `pending_payment` or `pending_admin_approval`

**Pricing**:
- 3 months: $299.99
- 6 months: $549.99
- 12 months: $999.99

### 3. INTERNATIONAL_STOCK_ACCOUNT
- **Auto-Approval**: ❌ NO
- **KYC Required**: ✅ YES (Brokerage level - highest)
- **Admin Approval**: ✅ YES
- **Payment Required**: ❌ NO
- **Subscription Based**: ❌ NO
- **Status After Application**: `pending_review` (KYC) → `pending_admin_approval`

**Required KYC Fields**:
- Date of birth
- Nationality
- Employment status
- Annual income
- Investment experience
- Source of funds
- Risk tolerance

**Required Documents**:
- Identity document (front)
- Identity document (back)
- Bank statement

### 4. GUARANTEED_RETURNS
- **Auto-Approval**: ❌ NO
- **KYC Required**: ✅ YES (Advanced level)
- **Admin Approval**: ✅ YES
- **Payment Required**: ❌ NO
- **Subscription Based**: ❌ NO
- **Status After Application**: `pending_review` (KYC) → `pending_admin_approval`

**Required KYC Fields**:
- Date of birth
- Nationality
- Employment status
- Annual income
- Investment experience

**Required Documents**:
- Identity document (front)
- Identity document (back)
- Bank statement

## Service Application Flow

### Auto-Approved Services (PREMIUM_STOCK_PICKS only)
1. Customer applies for service
2. System creates auto-approved KYC record (reviewed_by: null)
3. Service is immediately activated (active: true)
4. Status: `activated`

### Manual Approval Services (All others)
1. Customer applies for service
2. Customer provides required KYC data and documents
3. KYC status set to `pending`
4. Service created but not active (active: false)
5. Status: `pending_review` (waiting for KYC approval)
6. Admin reviews and approves KYC
7. Service status changes to `pending_admin_approval`
8. Admin approves service application
9. Service activated (active: true)
10. Status: `activated`

## Configuration Location
The service configurations are defined in:
`src/modules/customers/customers.service.ts` → `requiredConfig` object

## API Endpoints
- **Apply for Service**: `POST /api/v1/customers/services/apply`
- **Approve Service**: `POST /api/v1/customers/services/:serviceId/approve`
- **List Customer Services**: `GET /api/v1/customers/services/list`
- **Premium Membership Application**: `POST /api/v1/customers/services/premium-membership/apply`

## Security Notes
- Only `PREMIUM_STOCK_PICKS` bypasses KYC requirements
- All other services require proper KYC documentation and admin review
- UUID constraints are properly handled for auto-approved services
- Manual approval ensures compliance for high-risk services
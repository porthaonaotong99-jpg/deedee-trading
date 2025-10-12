# Investment Management API Documentation

## Overview
This API provides endpoints for managing guaranteed returns investments with automatic interest rate calculation based on investment amount and customer risk tolerance.

## Authentication
All endpoints require JWT Bearer token authentication.

## API Endpoints

### 1. Customer Investment Endpoints

#### POST /investment-requests
Submit a new investment request with payment slip.

**Request Body:**
```json
{
  "service_id": "service-uuid-456",
  "amount": 75000,
  "payment_slip_url": "https://storage.example.com/payment-slips/slip-456.jpg",
  "payment_date": "2025-10-12T14:20:00Z",
  "customer_notes": "Retirement savings with balanced approach",
  "requested_investment_period": "24 months",
  "requested_risk_tolerance": "medium",
  "requested_investment_goal": "Balanced growth and income generation"
}
```

**Response (201 Created):**
```json
{
  "request_id": "request-uuid-123",
  "status": "pending_admin_review",
  "calculated_tier": "silver",
  "calculated_interest_rate": 0.19,
  "risk_tolerance": "medium",
  "base_rate": 0.15,
  "risk_adjustment": 0.04,
  "tier_description": "SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns",
  "message": "Investment request submitted successfully. SILVER Tier (MEDIUM Risk): $50,000 - $99,999 → 19.0% returns"
}
```

#### GET /investment-requests/my-summary
Get customer's investment summary.

**Response (200 OK):**
```json
{
  "customer_id": "customer-uuid-123",
  "total_investments": 2,
  "total_original_investment": 125000,
  "total_current_balance": 148750,
  "total_interest_earned": 23750,
  "active_investments": 2,
  "pending_requests": 0,
  "investments": [
    {
      "request_id": "request-uuid-123",
      "amount": 75000,
      "tier": "silver",
      "interest_rate": 0.19,
      "status": "active",
      "start_date": "2025-09-15T00:00:00Z",
      "current_value": 89250
    }
  ]
}
```

#### GET /investment-requests/my-transactions
Get customer's transaction history.

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "transaction-uuid-789",
      "type": "INVESTMENT_APPROVED",
      "amount": 75000,
      "description": "Investment approved - SILVER tier (19.0%)",
      "effective_date": "2025-09-15T00:00:00Z",
      "investment_principal": 75000,
      "current_principal": 75000,
      "interest_rate": "0.19"
    }
  ],
  "total": 1
}
```

#### POST /investment-requests/return-request
Create a return request.

**Request Body:**
```json
{
  "investment_transaction_id": "transaction-uuid-789",
  "request_type": "INTEREST_ONLY",
  "requested_amount": 5000,
  "customer_reason": "Need funds for emergency medical expenses"
}
```

**Response (201 Created):**
```json
{
  "return_request_id": "return-uuid-456",
  "status": "pending_admin_review",
  "requested_amount": 5000,
  "request_type": "INTEREST_ONLY",
  "message": "Return request submitted successfully"
}
```

#### GET /investment-requests/interest-tiers
Get current interest rate tiers.

**Response (200 OK):**
```json
{
  "tiers": [
    {
      "name": "Bronze",
      "min_amount": 10000,
      "max_amount": 49999,
      "interest_rate": 0.15,
      "description": "Bronze tier - 15% annual returns"
    },
    {
      "name": "Silver",
      "min_amount": 50000,
      "max_amount": 99999,
      "interest_rate": 0.18,
      "description": "Silver tier - 18% annual returns"
    },
    {
      "name": "Gold",
      "min_amount": 100000,
      "max_amount": null,
      "interest_rate": 0.2,
      "description": "Gold tier - 20% annual returns"
    }
  ]
}
```

#### POST /investment-requests/calculate-tier
Calculate tier for investment amount.

**Request Body:**
```json
{
  "amount": 125000
}
```

**Response (200 OK):**
```json
{
  "calculated_tier": {
    "tier": "gold",
    "interestRate": 0.2,
    "description": "Gold - 20% returns"
  },
  "all_tiers": [
    "BRONZE: $10,000 - $49,999 (15% returns)",
    "SILVER: $50,000 - $99,999 (18% returns)",
    "GOLD: $100,000 - + (20% returns)"
  ],
  "is_qualified": true
}
```

### 2. Admin Endpoints

#### GET /investment-requests/pending
List pending investment requests (Admin only).

**Response (200 OK):**
```json
{
  "pending_requests": [
    {
      "id": "request-uuid-123",
      "customer_id": "customer-uuid-456",
      "amount": "75000",
      "calculated_tier": "silver",
      "calculated_interest_rate": "0.19",
      "risk_tolerance": "medium",
      "payment_slip_url": "https://storage.example.com/payment-slips/slip-456.jpg",
      "created_at": "2025-10-12T14:20:00Z",
      "status": "PENDING"
    }
  ],
  "total": 1
}
```

#### PUT /investment-requests/:id/approve
Approve investment request (Admin only).

**Request Body:**
```json
{
  "use_calculated_rate": true,
  "term_months": 12,
  "admin_notes": "Approved after reviewing payment slip and customer history"
}
```

**Alternative with custom rate:**
```json
{
  "use_calculated_rate": false,
  "custom_interest_rate": 0.22,
  "term_months": 12,
  "admin_notes": "Special rate approved due to VIP status"
}
```

**Response (200 OK):**
```json
{
  "transaction_id": "transaction-uuid-789",
  "approved_tier": "silver",
  "approved_interest_rate": 0.19,
  "tier_description": "SILVER tier - 19.0% returns",
  "message": "Investment approved and created successfully"
}
```

#### GET /investment-requests/pending-returns
List pending return requests (Admin only).

**Response (200 OK):**
```json
{
  "pending_returns": [
    {
      "id": "return-uuid-456",
      "customer_id": "customer-uuid-123",
      "investment_transaction_id": "transaction-uuid-789",
      "request_type": "INTEREST_ONLY",
      "requested_amount": "5000",
      "customer_reason": "Emergency medical expenses",
      "created_at": "2025-10-12T16:30:00Z",
      "status": "PENDING"
    }
  ],
  "total": 1
}
```

#### PUT /investment-requests/returns/:id/approve
Approve return request (Admin only).

**Request Body:**
```json
{
  "approved_amount": 4500,
  "payment_method": "bank_transfer",
  "payment_reference": "RETURN-2025-001234",
  "admin_notes": "Emergency return approved, reduced amount due to early withdrawal"
}
```

**Response (200 OK):**
```json
{
  "transaction_id": "approval-transaction-uuid-999",
  "approved_amount": 4500,
  "payment_method": "bank_transfer",
  "payment_reference": "RETURN-2025-001234",
  "message": "Return request approved successfully"
}
```

#### PUT /investment-requests/returns/:id/mark-paid
Mark return as paid (Admin only).

**Response (200 OK):**
```json
{
  "transaction_id": "approval-transaction-uuid-999",
  "status": "PAID",
  "message": "Return marked as paid successfully"
}
```

### 3. Interest Rate Configuration Admin Endpoints

#### GET /admin/interest-rates/configurations
Get all interest rate configurations (Admin only).

**Response (200 OK):**
```json
{
  "message": "Interest rate configurations retrieved successfully",
  "data": [
    {
      "id": "config-uuid-001",
      "tier_name": "bronze",
      "min_amount": "10000.00",
      "max_amount": "49999.99",
      "risk_tolerance": "medium",
      "base_interest_rate": "0.1200",
      "risk_adjustment": "0.0300",
      "final_interest_rate": "0.1500",
      "description": "Bronze tier for moderate risk investors - 15% returns",
      "is_active": true,
      "created_at": "2025-10-01T00:00:00Z"
    }
  ],
  "total": 9
}
```

#### POST /admin/interest-rates/configurations
Create new interest rate configuration (Admin only).

**Request Body:**
```json
{
  "tier_name": "platinum",
  "min_amount": 500000,
  "max_amount": null,
  "risk_tolerance": "high",
  "base_interest_rate": 0.25,
  "risk_adjustment": 0.05,
  "description": "Platinum tier for ultra-high-risk investors seeking maximum returns",
  "conditions": "Minimum 36-month commitment required"
}
```

**Response (201 Created):**
```json
{
  "message": "Interest rate configuration created successfully",
  "data": {
    "id": "config-uuid-010",
    "tier_name": "platinum",
    "min_amount": "500000.00",
    "max_amount": null,
    "risk_tolerance": "high",
    "base_interest_rate": "0.2500",
    "risk_adjustment": "0.0500",
    "final_interest_rate": "0.3000",
    "description": "Platinum tier for ultra-high-risk investors seeking maximum returns",
    "conditions": "Minimum 36-month commitment required",
    "is_active": true
  },
  "formatted_description": "PLATINUM Tier (HIGH Risk): $500,000 - No Limit → 30.0% returns"
}
```

#### PUT /admin/interest-rates/configurations/:id
Update interest rate configuration (Admin only).

**Request Body:**
```json
{
  "base_interest_rate": 0.20,
  "risk_adjustment": 0.08,
  "description": "Updated premium Gold tier with enhanced returns for qualified investors",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "message": "Interest rate configuration updated successfully",
  "data": {
    "id": "config-uuid-007",
    "tier_name": "gold",
    "final_interest_rate": "0.2800",
    "description": "Updated premium Gold tier with enhanced returns for qualified investors",
    "updated_at": "2025-10-12T16:45:00Z"
  },
  "formatted_description": "GOLD Tier (HIGH Risk): $100,000 - No Limit → 28.0% returns"
}
```

#### POST /admin/interest-rates/calculate
Calculate interest rate for amount and risk tolerance (Admin only).

**Request Body:**
```json
{
  "amount": 125000,
  "risk_tolerance": "high"
}
```

**Response (200 OK):**
```json
{
  "message": "Interest rate calculated successfully",
  "amount": 125000,
  "risk_tolerance": "high",
  "result": {
    "tier_name": "gold",
    "risk_tolerance": "high",
    "base_rate": 0.18,
    "risk_adjustment": 0.06,
    "final_rate": 0.24,
    "description": "GOLD Tier (HIGH Risk): $100,000 - No Limit → 24.0% returns",
    "min_amount": 100000,
    "max_amount": null
  },
  "formatted_rate": "24.00%",
  "breakdown": {
    "base_rate": "18.00%",
    "risk_adjustment": "6.00%",
    "final_rate": "24.00%"
  }
}
```

#### POST /admin/interest-rates/seed-defaults
Seed default interest rate configurations (Admin only).

**Response (200 OK):**
```json
{
  "message": "Default interest rate configurations seeded successfully"
}
```

#### GET /admin/interest-rates/enums
Get available enums for tier names and risk tolerance (Admin only).

**Response (200 OK):**
```json
{
  "message": "Available enums retrieved successfully",
  "data": {
    "tier_names": ["bronze", "silver", "gold", "platinum"],
    "risk_tolerance_levels": ["low", "medium", "high"]
  }
}
```

## Interest Rate Calculation Logic

The system calculates interest rates based on:

1. **Investment Amount Tiers:**
   - Bronze: $10,000 - $49,999
   - Silver: $50,000 - $99,999
   - Gold: $100,000+

2. **Risk Tolerance Levels:**
   - Low: Conservative investors (lower returns)
   - Medium: Balanced investors (moderate returns)
   - High: Aggressive investors (higher returns)

3. **Final Rate Calculation:**
   ```
   Final Rate = Base Rate + Risk Adjustment
   ```

4. **Example Configurations:**
   - Bronze + Low Risk: 12% + 1% = 13%
   - Silver + Medium Risk: 15% + 4% = 19%
   - Gold + High Risk: 18% + 6% = 24%

## Error Responses

### 400 Bad Request
```json
{
  "message": "Minimum investment amount is $10,000",
  "error": "BadRequestException",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden resource",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Investment request not found",
  "error": "NotFoundException",
  "statusCode": 404
}
```

## Database Schema

### interest_rate_configurations
```sql
CREATE TABLE interest_rate_configurations (
    id UUID PRIMARY KEY,
    tier_name VARCHAR(20) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    risk_tolerance VARCHAR(10) NOT NULL,
    base_interest_rate DECIMAL(5,4) NOT NULL,
    risk_adjustment DECIMAL(5,4) DEFAULT 0.0000,
    final_interest_rate DECIMAL(5,4) NOT NULL,
    description VARCHAR(500),
    conditions VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
# Investment Info Module - Guaranteed Returns System

## Overview

The Investment Info module provides a clean, focused guaranteed returns investment system that is completely separate from wallet/transfer modules. This module handles:

- Customer investment requests and applications
- Investment position tracking and management  
- Interest calculation and accrual
- Interest payments to customer wallets
- Investment ledger for complete audit trail
- Automated scheduled processing

## Architecture

### Core Entities

1. **InvestmentInfo** - Investment requests/applications
   - `requested_amount` - Investment principal amount
   - `interest_rate` - Annual interest rate (decimal)
   - `term_months` - Investment term in months
   - `maturity_date` - Expected maturity date
   - `payment_frequency` - Interest payment schedule
   - `notes` - Additional notes/comments
   - Status tracking and approval fields

2. **InvestmentReturns** - Active investment positions
   - Principal balance tracking (`principal_committed`, `principal_outstanding`)
   - Return balance tracking (`return_accrued`, `return_outstanding`, `return_paid`)
   - Accrual and payment dates (`start_at`, `maturity_at`, `next_payment_at`)
   - `effective_rate` - Applied interest rate

3. **InvestmentLedger** - Transaction audit trail
   - `FUND` - Initial investment funding
   - `ACCRUAL` - Interest accrual entries
   - `PAYOUT_INTEREST` - Interest payments to wallet
   - `PAYOUT_PRINCIPAL` - Principal return at maturity
   - `ADJUSTMENT` - Manual adjustments
   - `CANCEL` - Investment cancellation

### Removed Confusing Fields

**Cleaned up from InvestmentInfo:**
- ❌ `name` field (was hardcoded to 'guaranteed_returns_investment')
- ❌ `risk_tolerance` (not used in guaranteed returns)
- ❌ `investment_goal` (not used in current flow)
- ❌ `expected_annual_returns` (confusing with `interest_rate`)
- ❌ `payment_slip` (belongs in transfer history)
- ❌ `payment_type` (belongs in transfer history)

**Cleaned up from InvestmentReturns:**
- ❌ `payment_schedule` (redundant with `payment_frequency` in InvestmentInfo)
- ❌ `principal_withdrawn` (can be calculated from ledger)

**Cleaned up from InvestmentLedger:**
- ❌ `WITHDRAW_PRINCIPAL`, `LOSS`, `REVERSAL` (unused transaction types)

## API Endpoints

### Customer Endpoints

#### POST `/investment-info/guaranteed-returns`
Request a new guaranteed returns investment
```json
{
  "amount": 5000,
  "interest_rate": 0.12,
  "term_months": 12,
  "payment_frequency": "monthly",
  "notes": "Long-term investment for retirement"
}
```

#### GET `/investment-info/my-investments`
Get customer's investment summary and positions

### Admin Endpoints

#### GET `/investment-info/guaranteed-returns`
List all investment requests with status filter

#### POST `/investment-info/:id/approve`
Approve pending investment request

#### POST `/investment-info/:id/reject`
Reject pending investment request

#### POST `/investment-info/:id/calculate-accrual`
Calculate (but don't apply) interest accrual

#### POST `/investment-info/:id/apply-accrual`
Calculate and apply interest accrual

#### POST `/investment-info/:id/pay-interest`
Pay accrued interest to customer wallet
```json
{
  "amount": 100.50
}
```

#### POST `/investment-info/process-all-accruals`
Batch process accruals for all active investments

## Service Methods

### Core Investment Operations

- `requestGuaranteedReturnsInvestment()` - Customer initiates investment
- `approve()` - Admin approves investment (deducts wallet, creates position)
- `reject()` - Admin rejects investment
- `listGuaranteedReturns()` - List investments with filters

### Interest Management

- `calculateInterestAccrual()` - Calculate accrued interest
- `applyInterestAccrual()` - Apply accrual to position
- `payInterestToWallet()` - Transfer interest to customer wallet
- `processAllActiveAccruals()` - Batch process all investments

### Customer Dashboard

- `getCustomerInvestmentSummary()` - Get customer's investment overview

## Automated Processing

The `InvestmentSchedulerService` provides:

- **Daily Accrual** (1:00 AM) - Automatic interest accrual for all active investments
- **Maturity Check** (6:00 AM) - Check for investments reaching maturity
- **Weekly Reports** (Monday 9:00 AM) - Generate summary reports

## Database Schema

### investment_info
- Basic investment request information
- Customer and service references
- Investment terms and parameters
- Approval/rejection tracking

### investment_returns  
- Active investment position tracking
- Principal and return balances
- Accrual and payment dates
- Effective rates and schedules

### investment_ledger
- Complete transaction audit trail
- All investment-related movements
- Metadata for transaction context
- Correlation IDs for grouped transactions

## Usage Examples

### Customer Requesting Investment
```typescript
// Customer makes investment request
const result = await investmentService.requestGuaranteedReturnsInvestment(
  customerId, 
  5000, 
  {
    interestRate: 0.12,
    termMonths: 12,
    paymentFrequency: 'monthly'
  }
);
```

### Admin Processing Approval
```typescript
// Admin approves investment
const approval = await investmentService.approve(investmentId, adminId);

// This automatically:
// - Deducts from customer wallet
// - Creates investment position
// - Sets up interest accrual schedule
// - Creates audit trail entries
```

### Interest Processing
```typescript
// Calculate current accrual
const accrual = await investmentService.calculateInterestAccrual(positionId);

// Apply the accrual
const applied = await investmentService.applyInterestAccrual(positionId, adminId);

// Pay interest to wallet
const payment = await investmentService.payInterestToWallet(
  positionId, 
  accrual.accrued_amount, 
  adminId
);
```

## Key Differences from Wallet/Transfer

1. **Purpose Separation**
   - Wallet/Transfer: International account topups and general transfers
   - Investment: Guaranteed returns investments only

2. **Fund Management**
   - Wallet: General cash management
   - Investment: Dedicated investment positions with return tracking

3. **Workflow**
   - Wallet: Direct topup/transfer operations
   - Investment: Request → Approval → Position → Accrual → Payment cycle

4. **Audit Trail**
   - Wallet: Transfer history
   - Investment: Detailed ledger with investment-specific transaction types

## Configuration

Ensure your app module includes the ScheduleModule for automated processing:

```typescript
@Module({
  imports: [
    // ... other imports
    ScheduleModule.forRoot(),
    InvestmentInfoModule,
  ],
})
export class AppModule {}
```

## Testing

The system includes comprehensive error handling and validation:
- Wallet balance checks
- Investment status validations  
- Service activation requirements
- Transaction atomicity with database transactions
- Detailed logging for troubleshooting

## Future Enhancements

Potential areas for expansion:
- Multiple investment products
- Variable interest rates
- Early withdrawal options
- Automated maturity processing
- Integration with external investment platforms
- Advanced reporting and analytics
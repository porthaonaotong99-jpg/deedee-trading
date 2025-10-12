# Investment Info Schema Cleanup Summary

## Changes Made

### InvestmentInfo Entity - Removed Confusing Fields

**Removed:**
- ❌ `name` - Was hardcoded to 'guaranteed_returns_investment', unnecessary
- ❌ `risk_tolerance` - Not used in guaranteed returns flow
- ❌ `investment_goal` - Not used in current implementation
- ❌ `expected_annual_returns` - Confusing with `interest_rate` field
- ❌ `payment_slip` - Belongs in transfer history, not investment request
- ❌ `payment_type` - Belongs in transfer history, not investment request

**Updated:**
- ✅ `noted` → `notes` - Renamed for clarity
- ✅ `customer_id` → NOT NULL (required field)
- ✅ `service_id` → NOT NULL (required field)
- ✅ `payment_frequency` → DEFAULT 'monthly'

**Kept (Essential Fields):**
- ✅ `requested_amount` - Investment principal
- ✅ `interest_rate` - Annual rate (decimal)
- ✅ `term_months` - Investment term
- ✅ `maturity_date` - Expected end date
- ✅ `payment_frequency` - Payment schedule
- ✅ `notes` - Additional comments
- ✅ `rejection_reason` - Why rejected
- ✅ Status and approval tracking fields

### InvestmentReturns Entity - Removed Redundant Fields

**Removed:**
- ❌ `payment_schedule` - Redundant with `payment_frequency` in InvestmentInfo
- ❌ `principal_withdrawn` - Can be calculated from ledger entries

**Kept (Essential Fields):**
- ✅ Principal tracking (`principal_committed`, `principal_outstanding`)
- ✅ Return tracking (`return_accrued`, `return_outstanding`, `return_paid`)
- ✅ Date tracking (`start_at`, `maturity_at`, `next_payment_at`)
- ✅ `effective_rate` - Applied interest rate

### InvestmentLedger Entity - Simplified Transaction Types

**Removed:**
- ❌ `WITHDRAW_PRINCIPAL` - Not implemented yet
- ❌ `LOSS` - Not needed for guaranteed returns
- ❌ `REVERSAL` - Can use ADJUSTMENT instead

**Kept (Essential Types):**
- ✅ `FUND` - Initial investment funding
- ✅ `ACCRUAL` - Interest accrual entries
- ✅ `PAYOUT_INTEREST` - Interest payments to wallet
- ✅ `PAYOUT_PRINCIPAL` - Principal return at maturity
- ✅ `ADJUSTMENT` - Manual adjustments
- ✅ `CANCEL` - Investment cancellation

## Service Updates

**Removed:**
- ❌ Hardcoded `name` filter in `listGuaranteedReturns()`
- ❌ Setting `payment_schedule` and `principal_withdrawn` in approval

**Updated:**
- ✅ `noted` → `notes` parameter naming
- ✅ Added `notes` to request options
- ✅ Cleaner entity creation without unused fields

## Database Constraints Added

- ✅ Payment frequency validation (monthly, quarterly, yearly, at_maturity)
- ✅ Positive amount validation
- ✅ Interest rate validation (0% to 100%)
- ✅ Term months validation (1 to 120 months)
- ✅ Better indexes for performance
- ✅ Comprehensive column documentation

## API Updates

**Enhanced Request Schema:**
```json
{
  "amount": 5000,           // Required: Investment principal
  "interest_rate": 0.12,    // Optional: Annual rate (decimal)
  "term_months": 12,        // Optional: Term in months
  "payment_frequency": "monthly", // Optional: Payment schedule
  "notes": "Retirement investment"  // Optional: Comments
}
```

**Validation:**
- Amount must be > 0
- Interest rate between 0-100% (0.0-1.0)
- Term between 1-120 months
- Payment frequency must be valid enum

## Benefits

1. **Cleaner Schema** - Removed 8 unused/confusing fields
2. **Better Validation** - Added proper constraints and checks
3. **Clearer Purpose** - Each field has a specific role
4. **Less Confusion** - No redundant or misleading fields
5. **Better Performance** - Improved indexes
6. **Documentation** - Comprehensive comments
7. **Type Safety** - Proper nullable/required fields

## Migration Required

Run `clean_investment_schema.sql` to:
- Drop unused columns
- Add constraints
- Update existing data
- Improve indexes
- Add documentation

## Breaking Changes

⚠️ **API Changes:**
- `noted` parameter → `notes`
- Removed unused fields from responses

⚠️ **Database Changes:**
- Multiple columns dropped
- Foreign keys made NOT NULL
- New constraints added

These changes make the investment system much cleaner and more focused on its core purpose: guaranteed returns investments.
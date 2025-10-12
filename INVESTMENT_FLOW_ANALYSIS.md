# Investment Flow Analysis & Redesign

## Your Required Flow

### 1. Customer Investment Process
- Customer can invest multiple times (Monday, Wednesday, different months)
- Each investment requires payment slip upload
- Each investment is tracked separately
- No automatic wallet deduction

### 2. Admin Investment Approval
- Admin reviews payment slip for each investment
- Admin approves/rejects individual investments
- Upon approval, interest calculation starts for that specific investment
- Each investment has its own interest tracking

### 3. Total Investment Tracking
- Need summary table showing total invested amounts per customer
- Track all active investments aggregated

### 4. Customer Return Requests
- Customer can request to withdraw/return money
- Each return request creates a history record
- Returns can be partial or full

### 5. Admin Return Approval
- Admin reviews return requests
- Admin manually processes payment to customer
- Return history maintained

## Current System Issues

### Problems with Current Design:
1. **Single Investment Assumption**: Current entities assume one investment per InvestmentInfo
2. **Missing Payment Slip**: No payment slip upload handling
3. **No Return Requests**: Missing return request functionality
4. **No Total Tracking**: No summary table for total investments
5. **Wallet Integration**: Too tightly coupled with wallet system

## Proposed New Design

### New Entity Structure:

1. **InvestmentRequest** (replaces InvestmentInfo)
   - Individual investment requests with payment slips
   - Each request is separate and independent

2. **ActiveInvestment** (replaces InvestmentReturns) 
   - Tracks each approved investment separately
   - Interest calculation per investment

3. **InvestmentSummary** (new)
   - Customer's total investment overview
   - Aggregated amounts and returns

4. **ReturnRequest** (new)
   - Customer return/withdrawal requests
   - Links to specific investments or amounts

5. **InvestmentTransaction** (enhanced ledger)
   - All investment-related transactions
   - Payment slips, approvals, returns

### Flow Design:

```
Customer Investment Flow:
1. Customer creates investment request + uploads payment slip
2. Admin reviews payment slip and approves/rejects
3. On approval: Create ActiveInvestment + update InvestmentSummary
4. Interest accrues on each ActiveInvestment separately

Customer Return Flow:
1. Customer creates return request (amount + reason)
2. Admin reviews and approves/rejects
3. On approval: Admin manually processes payment
4. Update ActiveInvestment + InvestmentSummary + create transaction
```

Would you like me to implement this redesigned system?
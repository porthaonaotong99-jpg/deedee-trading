# Service Application API Examples

This file provides concrete example request payloads and responses for `POST /customers/services/apply` and usage notes.

## Service Types
- premium_membership
- premium_stock_picks
- international_stock_account
- guaranteed_returns

## 1. Basic Service – Premium Membership
Minimal request (no KYC or documents required):
```json
{
  "service_type": "premium_membership"
}
```
Optional with address enrichment:
```json
{
  "service_type": "premium_membership",
  "address": {
    "country_id": "LA",
    "province_id": "LA-VT",
    "district_id": "LA-VT-01",
    "village": "Phonexay",
    "address_line": "House 12, Lane 3",
    "postal_code": "01000"
  }
}
```
Sample success response:
```json
{
  "status": "active",
  "service_type": "premium_membership",
  "kyc_level": "basic"
}
```

## 2. Premium Stock Picks – Light KYC
```json
{
  "service_type": "premium_stock_picks",
  "kyc": {
    "dob": "1992-04-15",
    "nationality": "LA",
    "risk_tolerance": "medium"
  }
}
```
Response (example):
```json
{
  "status": "active",
  "service_type": "premium_stock_picks",
  "kyc_level": "basic"
}
```

## 3. International Stock Account – Advanced KYC + Documents
```json
{
  "service_type": "international_stock_account",
  "kyc": {
    "dob": "1988-11-03",
    "nationality": "TH",
    "marital_status": "single",
    "employment_status": "employed",
    "annual_income": 42000,
    "employer_name": "LaoTech Finance",
    "occupation": "analyst",
    "investment_experience": 5,
    "dependent_number": 1,
    "source_of_funds": "salary_savings",
    "risk_tolerance": "high",
    "pep_flag": false,
    "tax_id": "TH-889233411",
    "fatca_status": "non_us_person"
  },
  "address": {
    "country_id": "TH",
    "province_id": "TH-10",
    "district_id": "TH-10-05",
    "village": "Sukhumvit Soi 22",
    "address_line": "88/12 Condo Unit 1905",
    "postal_code": "10110"
  },
  "documents": [
    {
      "doc_type": "IDENTITY_FRONT",
      "storage_ref": "s3://kyc-docs/uid123/front.jpg",
      "checksum": "d0a2f6c0d9b07f7e5c4b2a3f8899aaabce11223344556677889900aabbccdde0"
    },
    {
      "doc_type": "IDENTITY_BACK",
      "storage_ref": "s3://kyc-docs/uid123/back.jpg",
      "checksum": "aa11bb22cc33dd44ee55ff6677889900aa11bb22cc33dd44ee55ff6677889900"
    },
    {
      "doc_type": "PROOF_OF_ADDRESS",
      "storage_ref": "s3://kyc-docs/uid123/utility.pdf"
    }
  ]
}
```
Response (example):
```json
{
  "status": "active",
  "service_type": "international_stock_account",
  "kyc_level": "advanced"
}
```

## 4. Guaranteed Returns – Highest Tier
```json
{
  "service_type": "guaranteed_returns",
  "kyc": {
    "dob": "1979-02-21",
    "nationality": "LA",
    "marital_status": "married",
    "employment_status": "self_employed",
    "annual_income": 95000,
    "employer_name": "Owner - Mekong Capital Partners",
    "occupation": "fund_manager",
    "investment_experience": 12,
    "dependent_number": 3,
    "source_of_funds": "business_proceeds",
    "risk_tolerance": "medium",
    "pep_flag": false,
    "tax_id": "LA-INV-778899",
    "fatca_status": "non_us_person"
  },
  "address": {
    "country_id": "LA",
    "province_id": "LA-XA",
    "district_id": "LA-XA-03",
    "village": "Ban Sisavath",
    "address_line": "Villa 4, Riverside",
    "postal_code": "15020"
  },
  "documents": [
    {
      "doc_type": "IDENTITY_FRONT",
      "storage_ref": "s3://kyc-docs/uid456/front.png"
    },
    {
      "doc_type": "BANK_STATEMENT",
      "storage_ref": "s3://kyc-docs/uid456/bank_statement_q1.pdf"
    },
    {
      "doc_type": "PROOF_OF_ADDRESS",
      "storage_ref": "s3://kyc-docs/uid456/lease.pdf"
    }
  ]
}
```
Response (example):
```json
{
  "status": "active",
  "service_type": "guaranteed_returns",
  "kyc_level": "brokerage"
}
```

## 5. Re-Apply Existing Service (Idempotent Example)
```json
{
  "service_type": "premium_membership"
}
```
Possible response (if already active):
```json
{
  "status": "active",
  "service_type": "premium_membership",
  "kyc_level": "basic"
}
```

## 6. Missing Required Document (Failure Example)
```json
{
  "service_type": "international_stock_account",
  "kyc": {
    "dob": "1990-01-10",
    "nationality": "TH",
    "employment_status": "employed",
    "annual_income": 60000,
    "source_of_funds": "salary",
    "risk_tolerance": "medium"
  },
  "documents": [
    { "doc_type": "IDENTITY_FRONT", "storage_ref": "s3://kyc-docs/u999/front.jpg" }
  ]
}
```
Typical error (illustrative):
```json
{
  "statusCode": 400,
  "message": "Missing required documents: IDENTITY_BACK, PROOF_OF_ADDRESS",
  "error": "Bad Request"
}
```

## 7. Field Tier Summary
| Tier | Services | KYC Fields (Typical) | Documents |
|------|----------|----------------------|-----------|
| Basic | premium_membership, premium_stock_picks | Optional: dob, nationality, risk_tolerance | None |
| Advanced | international_stock_account | dob, nationality, marital_status, employment_status, annual_income, source_of_funds, risk_tolerance, investment_experience, tax_id, fatca_status | IDENTITY_FRONT, IDENTITY_BACK, PROOF_OF_ADDRESS |
| Brokerage | guaranteed_returns | All advanced + stronger source_of_funds provenance, pep_flag | All advanced + BANK_STATEMENT / INCOME_PROOF |

(Adjust to match your internal matrix in `customers.service.ts`).

## 8. Recommendations / Next Steps
- Add class-validator decorators for stricter payload validation.
- Standardize error codes for frontend mapping (e.g. `MISSING_DOCUMENT`).
- Add an `already_active` boolean in response for idempotent clarity.
- Implement audit logging for each application attempt.

---
This file is for developer reference and not served publicly.

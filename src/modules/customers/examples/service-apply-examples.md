title: Frontend Service Application Specification

## Purpose

Clear contract for frontend engineers to know EXACTLY which fields to send for each service type when calling:
POST /customers/services/apply

## Service Types (enum)

```
premium_membership | premium_stock_picks | international_stock_account | guaranteed_returns
```

## Document Types (enum)

```
identity_front | identity_back | passport | bank_statement | address_proof | selfie
```

## Field Requirements Matrix

| Field                     | premium_membership | premium_stock_picks | international_stock_account | guaranteed_returns       |
| ------------------------- | ------------------ | ------------------- | --------------------------- | ------------------------ |
| service_type              | REQUIRED           | REQUIRED            | REQUIRED                    | REQUIRED                 |
| kyc.dob                   | optional           | optional            | required                    | required                 |
| kyc.nationality           | optional           | optional            | required                    | required                 |
| kyc.marital_status        | -                  | -                   | required                    | required                 |
| kyc.employment_status     | -                  | optional            | required                    | required                 |
| kyc.annual_income         | -                  | optional            | required                    | required                 |
| kyc.employer_name         | -                  | optional            | optional                    | required                 |
| kyc.occupation            | -                  | optional            | required                    | required                 |
| kyc.investment_experience | -                  | optional            | required                    | required                 |
| kyc.dependent_number      | -                  | -                   | optional                    | optional                 |
| kyc.source_of_funds       | -                  | optional            | required                    | required (more scrutiny) |
| kyc.risk_tolerance        | optional           | required            | required                    | required                 |
| kyc.pep_flag              | -                  | -                   | optional                    | required                 |
| kyc.tax_id                | -                  | -                   | required                    | required                 |
| kyc.fatca_status          | -                  | -                   | required                    | required                 |
| address.\*                | optional           | optional            | required                    | required                 |
| docs.identity_front       | -                  | -                   | required                    | required                 |
| docs.identity_back        | -                  | -                   | required                    | required                 |
| docs.address_proof        | -                  | -                   | required                    | required                 |
| docs.bank_statement       | -                  | -                   | optional                    | required                 |
| docs.selfie               | -                  | -                   | optional                    | optional                 |

Legend: '-' = not sent, optional = include if available, required = must be present.

## Validation Rules

| Aspect            | Rule                                        |
| ----------------- | ------------------------------------------- | ------------- | ---------- | ------- | ------- |
| Date format       | dob: YYYY-MM-DD (UTC)                       |
| Income            | annual_income: integer > 0                  |
| Experience        | investment_experience: integer >= 0 (years) |
| Dependent number  | integer >= 0                                |
| pep_flag          | boolean                                     |
| tax_id            | non-empty string when required              |
| risk_tolerance    | low                                         | medium        | high       |
| employment_status | employed                                    | self_employed | unemployed | retired | student |
| marital_status    | single                                      | married       | divorced   | widowed |
| source_of_funds   | free-form (future: restrict)                |
| storage_ref       | opaque string (S3 key / path / URL)         |
| checksum          | hex string (64 chars for sha256) optional   |

## Minimal Payloads

## Full Payload Examples

### international_stock_account

```json
{
  "service_type": "international_stock_account",
  "kyc": {
    "dob": "1988-03-21",
    "nationality": "TH",
    "marital_status": "single",
    "employment_status": "employed",
    "annual_income": 62000,
    "employer_name": "Siam Finance Group",
    "occupation": "research_analyst",
    "investment_experience": 6,
    "source_of_funds": "salary_savings",
    "risk_tolerance": "high",
    "pep_flag": false,
    "tax_id": "TH-778812349",
    "fatca_status": "non_us_person"
  },
  "address": {
    "country_id": "TH",
    "province_id": "TH-10",
    "district_id": "TH-10-05",
    "village": "Sukhumvit Soi 24",
    "address_line": "Condo 88/19, Floor 12",
    "postal_code": "10110"
  },
  "documents": [
    {
      "doc_type": "identity_front",
      "storage_ref": "s3://kyc-docs/intl001/id-front.jpg"
    },
    {
      "doc_type": "identity_back",
      "storage_ref": "s3://kyc-docs/intl001/id-back.jpg"
    },
    {
      "doc_type": "bank_statement",
      "storage_ref": "s3://kyc-docs/intl001/utility-may.pdf"
    }
  ]
}
```

### guaranteed_returns (highest tier)

```json
{
  "service_type": "guaranteed_returns",
  "kyc": {
    "dob": "1979-09-09",
    "nationality": "LA",
    "marital_status": "married",
    "employment_status": "self_employed",
    "annual_income": 150000,
    "employer_name": "Mekong Capital Partners",
    "occupation": "fund_manager",
    "investment_experience": 12,
    "source_of_funds": "business_proceeds",
    "risk_tolerance": "medium",
    "pep_flag": false,
    "tax_id": "LA-INV-559900",
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
      "doc_type": "identity_front",
      "storage_ref": "s3://kyc-docs/gr001/id-front.png"
    },
    {
      "doc_type": "identity_back",
      "storage_ref": "s3://kyc-docs/gr001/id-back.png"
    },
    {
      "doc_type": "bank_statement",
      "storage_ref": "s3://kyc-docs/gr001/bank-statement-q2.pdf"
    },
    {
      "doc_type": "address_proof",
      "storage_ref": "s3://kyc-docs/gr001/lease.pdf"
    }
  ]
}
```

## Response Shape

```json
{
  "status": "active",
  "service_type": "international_stock_account",
  "kyc_level": "advanced"
}
```

## Error Examples

Missing required docs (international_stock_account):

```json
{
  "statusCode": 400,
  "message": "Missing required documents: identity_back, address_proof",
  "error": "Bad Request"
}
```

Invalid enum:

```json
{
  "statusCode": 400,
  "message": "employment_status must be one of: employed,self_employed,unemployed,retired,student",
  "error": "Bad Request"
}
```

## Quick Reference JSON (Frontend Mapping)

```json
{
  "premium_membership": {
    "required": { "service_type": true },
    "optional_kyc": ["dob", "nationality", "risk_tolerance"],
    "documents": []
  },
  "premium_stock_picks": {
    "required": { "service_type": true, "kyc.risk_tolerance": true },
    "optional_kyc": ["dob", "nationality", "investment_experience"],
    "documents": []
  },
  "international_stock_account": {
    "required_kyc": [
      "dob",
      "nationality",
      "marital_status",
      "employment_status",
      "annual_income",
      "occupation",
      "investment_experience",
      "source_of_funds",
      "risk_tolerance",
      "tax_id",
      "fatca_status"
    ],
    "required_documents": ["identity_front", "identity_back", "address_proof"],
    "optional_documents": ["selfie"]
  },
  "guaranteed_returns": {
    "required_kyc": [
      "dob",
      "nationality",
      "marital_status",
      "employment_status",
      "annual_income",
      "occupation",
      "investment_experience",
      "source_of_funds",
      "risk_tolerance",
      "pep_flag",
      "tax_id",
      "fatca_status"
    ],
    "required_documents": [
      "identity_front",
      "identity_back",
      "address_proof",
      "bank_statement"
    ],
    "optional_documents": ["selfie"]
  }
}
```

## File Locations

- Payload JSON examples: `src/modules/customers/examples/payloads/`
- Postman collection: `src/modules/customers/examples/postman_collection.json`

## Next Enhancements (Backend)

- Enforce validation (class-validator) for enums & formats
- Add standardized error codes (e.g. SERVICE_DOC_MISSING)
- Add already_active flag in response for idempotency clarity
- Introduce audit logging hooks

---

This specification is internal; do not expose publicly.

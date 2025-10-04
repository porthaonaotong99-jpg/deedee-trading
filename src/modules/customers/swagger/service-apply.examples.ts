// Centralized Swagger example payloads for Service Application endpoint
// Keeps controller lean and allows reuse (e.g. Postman export scripts)
import { CustomerServiceType } from '../entities/customer-service.entity';

export const ServiceApplyRequestExamples = {
  premiumMembership3Months: {
    summary: 'Premium Membership - 3 Months',
    value: {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      subscription: {
        duration: 3,
        fee: 299.99,
      },
    },
  },
  premiumMembership6Months: {
    summary: 'Premium Membership - 6 Months (Popular)',
    value: {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      subscription: {
        duration: 6,
        fee: 549.99,
      },
    },
  },
  premiumMembership12Months: {
    summary: 'Premium Membership - 12 Months (Best Value)',
    value: {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      subscription: {
        duration: 12,
        fee: 999.99,
      },
    },
  },
  premiumStockPicks: {
    summary: 'Premium Stock Picks (Free)',
    value: {
      service_type: CustomerServiceType.PREMIUM_STOCK_PICKS,
    },
  },
  internationalStockAccount: {
    summary: 'International Stock Account (advanced)',
    value: {
      service_type: CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT,
      kyc: {
        dob: '1988-03-21',
        nationality: 'TH',
        marital_status: 'single',
        employment_status: 'employed',
        annual_income: 62000,
        employer_name: 'Siam Finance Group',
        occupation: 'research_analyst',
        investment_experience: 6,
        source_of_funds: 'salary_savings',
        risk_tolerance: 'high',
        pep_flag: false,
        tax_id: 'TH-778812349',
        fatca_status: 'non_us_person',
      },
      address: {
        country_id: 'TH',
        province_id: 'TH-10',
        district_id: 'TH-10-05',
        village: 'Sukhumvit Soi 24',
        address_line: 'Condo 88/19, Floor 12',
        postal_code: '10110',
      },
      documents: [
        {
          doc_type: 'identity_front',
          storage_ref: 's3://kyc-docs/intl001/id-front.jpg',
        },
        {
          doc_type: 'identity_back',
          storage_ref: 's3://kyc-docs/intl001/id-back.jpg',
        },
        {
          doc_type: 'address_proof',
          storage_ref: 's3://kyc-docs/intl001/utility-may.pdf',
        },
      ],
    },
  },
  guaranteedReturns: {
    summary: 'Guaranteed Returns (highest tier)',
    value: {
      service_type: CustomerServiceType.GUARANTEED_RETURNS,
      kyc: {
        dob: '1979-09-09',
        nationality: 'LA',
        marital_status: 'married',
        employment_status: 'self_employed',
        annual_income: 150000,
        employer_name: 'Mekong Capital Partners',
        occupation: 'fund_manager',
        investment_experience: 12,
        source_of_funds: 'business_proceeds',
        risk_tolerance: 'medium',
        pep_flag: false,
        tax_id: 'LA-INV-559900',
        fatca_status: 'non_us_person',
      },
      address: {
        country_id: 'LA',
        province_id: 'LA-XA',
        district_id: 'LA-XA-03',
        village: 'Ban Sisavath',
        address_line: 'Villa 4, Riverside',
        postal_code: '15020',
      },
      documents: [
        {
          doc_type: 'identity_front',
          storage_ref: 's3://kyc-docs/gr001/id-front.png',
        },
        {
          doc_type: 'identity_back',
          storage_ref: 's3://kyc-docs/gr001/id-back.png',
        },
        {
          doc_type: 'bank_statement',
          storage_ref: 's3://kyc-docs/gr001/bank-statement-q2.pdf',
        },
        {
          doc_type: 'address_proof',
          storage_ref: 's3://kyc-docs/gr001/lease.pdf',
        },
      ],
    },
  },
};

export const ServiceApplyResponseExamples = {
  premiumMembershipPending: {
    summary: 'Premium Membership - Payment Required',
    value: {
      status: 'pending_payment',
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      kyc_level: 'basic',
      subscription: {
        duration: 6,
        expires_at: '2025-04-02T00:00:00.000Z',
        fee: 549.99,
        payment_status: 'pending',
      },
      message: 'Subscription created. Please complete payment to activate.',
    },
  },
  premiumStockPicksActive: {
    summary: 'Premium Stock Picks - Activated',
    value: {
      status: 'activated',
      service_type: CustomerServiceType.PREMIUM_STOCK_PICKS,
      kyc_level: 'basic',
    },
  },
  premiumActive: {
    summary: 'Premium active',
    value: {
      status: 'activated',
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      kyc_level: 'basic',
    },
  },
  intlPending: {
    summary: 'International account pending review',
    value: {
      status: 'pending_review',
      service_type: CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT,
      kyc_level: 'brokerage',
    },
  },
};

export const ServiceApplyErrorExamples = {
  missingDocs: {
    summary: 'Missing required documents error',
    value: {
      statusCode: 400,
      message: 'Missing required documents: identity_back, address_proof',
      error: 'Bad Request',
    },
  },
};

export const ServiceEnumDescription =
  'Enum sets: risk_tolerance=low|medium|high, employment_status=employed|self_employed|unemployed|retired|student, ' +
  'marital_status=single|married|divorced|widowed, ' +
  'document.doc_type=identity_front|identity_back|passport|bank_statement|address_proof|selfie';

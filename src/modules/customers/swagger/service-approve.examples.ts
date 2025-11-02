import { CustomerServiceType } from '../entities/customer-service.entity';

export const ServiceApproveResponseExamples = {
  success: {
    summary: 'Approve brokerage account - success',
    description: 'Pending brokerage account approved after KYC review.',
    value: {
      status: 'approved',
      service_id: 'd9f9c7d8-4c77-4c21-8b0f-1ea5b5f0a111',
      service_type: CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT,
      kyc_level: 'brokerage',
    },
  },
  alreadyActive: {
    summary: 'Already active',
    description: 'Service was previously approved.',
    value: {
      status: 'approved',
      service_id: 'd9f9c7d8-4c77-4c21-8b0f-1ea5b5f0a111',
      service_type: CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT,
    },
  },
  noPending: {
    summary: 'No pending KYC',
    description: 'Attempt to approve when no pending KYC exists.',
    value: {
      statusCode: 400,
      message: 'No pending KYC to approve for this service',
      error: 'Bad Request',
    },
  },
  notFound: {
    summary: 'Not found',
    description: 'Invalid or unknown service id.',
    value: {
      statusCode: 404,
      message: 'Service application not found',
      error: 'Not Found',
    },
  },
};

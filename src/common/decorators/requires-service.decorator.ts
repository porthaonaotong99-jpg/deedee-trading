import { SetMetadata } from '@nestjs/common';
import { CustomerServiceType } from '../../modules/customers/entities/customer-service.entity';

export const REQUIRED_SERVICE_TYPE = 'required_service_type';

export const RequiresService = (service: CustomerServiceType) =>
  SetMetadata(REQUIRED_SERVICE_TYPE, service);

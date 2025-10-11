import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CustomerServiceType } from '../../modules/customers/entities/customer-service.entity';
import { CustomersService } from '../../modules/customers/customers.service';
import { REQUIRED_SERVICE_TYPE } from '../decorators/requires-service.decorator';

@Injectable()
export class RequiredServiceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly customersService: CustomersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<CustomerServiceType>(
      REQUIRED_SERVICE_TYPE,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // no requirement defined

    const req = context
      .switchToHttp()
      .getRequest<{ user?: { sub: string; type: string } }>();
    const user = req.user;
    if (!user || user.type !== 'customer') {
      throw new ForbiddenException('Customer authentication required');
    }

    const services = (await this.customersService.listServices(
      user.sub,
    )) as Array<{ service_type: CustomerServiceType; active?: boolean }>; // minimal shape
    const ok = Array.isArray(services)
      ? services.some((s) => s.service_type === required && s.active === true)
      : false;
    if (!ok) {
      throw new ForbiddenException(
        'Required customer service not active. Please apply and get approved.',
      );
    }
    return true;
  }
}

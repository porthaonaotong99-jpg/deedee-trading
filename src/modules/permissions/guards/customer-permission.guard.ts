type CustomerRequest = Request & {
  user?: { id: string };
  route?: { meta?: { requiredPermission?: string } };
};
import { Request } from 'express';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerService } from '../../customers/entities/customer-service.entity';
import { ServicePermission } from '../entities/service-permission.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class CustomerPermissionGuard implements CanActivate {
  constructor(
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    @InjectRepository(ServicePermission)
    private readonly servicePermissionRepo: Repository<ServicePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: CustomerRequest = context.switchToHttp().getRequest();
    const customerId: string | undefined = request.user?.id;
    const route = request.route as
      | { meta?: { requiredPermission?: string } }
      | undefined;

    const requiredPermission: string | undefined =
      route?.meta?.requiredPermission;

    if (!customerId || !requiredPermission) {
      throw new ForbiddenException('Missing customer or permission');
    }
    // Get all active services for customer
    const services = await this.customerServiceRepo.find({
      where: { customer_id: customerId, active: true },
    });
    if (!Array.isArray(services) || services.length === 0) {
      throw new ForbiddenException('No active service');
    }
    // Get all permissions for these services
    const serviceTypes: CustomerService['service_type'][] = services.map(
      (s) => s.service_type,
    );
    const servicePermissions = await this.servicePermissionRepo.find({
      where: serviceTypes.map((type) => ({ service_type: type })),
    });
    const allowedPermissions: string[] = servicePermissions.map(
      (sp: ServicePermission) => sp.permission_name,
    );
    if (!allowedPermissions.includes(requiredPermission)) {
      throw new ForbiddenException('Permission denied');
    }
    return true;
  }
}

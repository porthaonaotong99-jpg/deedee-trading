import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from 'src/common/decorators/permissions.decorator';
import { JwtPayload } from 'src/common/interfaces';
import { UsersService } from 'src/modules/users/users.service';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) return false;

    // If JWT represents an internal user, load permissions from role linkage.
    if (user.type === 'user') {
      const userPermissions = await this.usersService.getUserPermissions(
        user.sub,
      );
      return requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    }

    // Lightweight permission model for customers: allow specific read-only scopes.
    if (user.type === 'customer') {
      const customerImplicitPermissions = [
        'customer-stocks:read',
        // future: 'wallets:read-self', etc.
      ];
      return requiredPermissions.some((p) =>
        customerImplicitPermissions.includes(p),
      );
    }

    return false;
  }
}

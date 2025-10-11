import { Controller, Get, Query, ValidationPipe, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionPackagesService } from './subscription-packages.service';
import {
  SubscriptionPackageFilterDto,
  SubscriptionPackageResponseDto,
} from './dto/subscription-packages.dto';
import { handleSuccessMany } from '../../common/utils/response.util';
import type { JwtPayload } from '../../common/interfaces';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomerService,
  CustomerServiceType,
} from '../customers/entities/customer-service.entity';
// Payment lookup removed; we now rely solely on CustomerService.subscription_package_id
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtSecrets } from '../../config/jwt.config';

@ApiTags('Subscription Packages')
@Controller('subscription-packages')
export class SubscriptionPackagesController {
  constructor(
    private readonly svc: SubscriptionPackagesService,
    @InjectRepository(CustomerService)
    private readonly customerServiceRepo: Repository<CustomerService>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subscription packages' })
  @ApiQuery({ name: 'service_type', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search text',
  })
  @ApiResponse({
    status: 200,
    description: 'Packages list',
    type: [SubscriptionPackageResponseDto],
  })
  async list(
    @Query(ValidationPipe) filter: SubscriptionPackageFilterDto,
    @Req() req: Request,
  ) {
    const result = await this.svc.list(filter);

    // Try to parse Authorization header (optional)
    let user: JwtPayload | undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token = auth.substring(7);
      try {
        const secrets = getJwtSecrets(this.configService);
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: secrets.customerSecret,
        });
        if (payload?.type === 'customer') {
          user = payload;
        }
      } catch {
        // ignore invalid token and proceed anonymously
      }
    }

    // If authenticated as customer, enrich using current service's subscription_package_id
    let enriched = result.data;
    if (user?.type === 'customer') {
      const now = new Date();
      // Get the active premium membership service (current subscription)
      const activeService = await this.customerServiceRepo.findOne({
        where: {
          customer_id: user.sub,
          service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
          active: true,
        },
        select: {
          id: true,
          active: true,
          subscription_expires_at: true,
          subscription_package_id: true,
        },
        order: { applied_at: 'DESC' },
      });

      let currentPackageId: string | undefined;
      let expires: Date | null = null;

      if (activeService) {
        expires = activeService.subscription_expires_at ?? null;
        currentPackageId = activeService.subscription_package_id ?? undefined;
      }

      enriched = result.data.map((pkg) => {
        const isCurrent = Boolean(
          currentPackageId && pkg.id === currentPackageId,
        );
        const daysLeft = expires
          ? Math.ceil(
              (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
          : undefined;
        return {
          ...pkg,
          is_current: isCurrent,
          expiredDate: isCurrent ? expires || undefined : undefined,
          days_left: daysLeft,
        } as SubscriptionPackageResponseDto;
      });
    }

    return handleSuccessMany({
      data: enriched,
      total: result.total,
      message: 'Subscription packages retrieved successfully',
    });
  }
}

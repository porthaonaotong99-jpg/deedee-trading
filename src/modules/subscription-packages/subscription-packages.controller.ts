import { Controller, Get, Query, ValidationPipe, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionPackagesService } from './subscription-packages.service';
import {
  SubscriptionPackageFilterDto,
  SubscriptionPackageResponseDto,
} from './dto/subscription-packages.dto';
import { handleSuccessPaginated } from '../../common/utils/response.util';
import type { JwtPayload } from '../../common/interfaces';
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
    const result = await this.svc.listWithCustomerContext(
      filter,
      user?.type === 'customer' ? user.sub : undefined,
    );

    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Subscription packages retrieved successfully',
    });
  }
}

import {
  Controller,
  Get,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// (Customer apply/renew endpoints moved to grouped controllers - only admin pending list remains here)
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { CustomersService } from './customers.service';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { handleSuccessPaginated } from '../../common/utils/response.util';

@ApiTags('premium-membership (admin)')
@ApiBearerAuth()
@Controller('customers/admin/premium-membership')
export class PremiumMembershipAdminController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('pending')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({
    summary: '[PM Step 2] List pending applications & renewals',
    description:
      'Admin lists premium membership applications and renewals awaiting payment slip approval.',
  })
  async pending(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.type !== 'user') throw new ForbiddenException();
    const result = await this.customersService.getPendingPremiumMemberships({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Pending premium membership items retrieved',
    });
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { handleSuccessOne } from '../../common/utils/response.util';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';

class RequestTopupDto {
  amount!: number;
  payment_slip?: string;
}
class RejectTopupDto {
  reason?: string;
}

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet (customer authenticated)' })
  async getMyWallet(@AuthUser() user: JwtPayload) {
    if (!user || user.type !== 'customer') {
      return handleSuccessOne({
        data: null,
        message: 'No wallet (not customer)',
      });
    }
    const wallet = await this.service.findByCustomerId(user.sub);
    return handleSuccessOne({ data: wallet, message: 'Wallet fetched' });
  }

  // --- Funding Flow ---
  @Post('topup')
  @UseGuards(PermissionsGuard)
  @Permissions('wallets:topup')
  @ApiOperation({ summary: 'Request a wallet topup (customer)' })
  @ApiBody({ type: RequestTopupDto })
  async requestTopup(
    @Body(ValidationPipe) dto: RequestTopupDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'customer') {
      return handleSuccessOne({ data: null, message: 'Unauthorized' });
    }
    const transfer = await this.service.requestTopup({
      customerId: user.sub,
      amount: dto.amount,
      payment_slip: dto.payment_slip,
    });
    return handleSuccessOne({ data: transfer, message: 'Topup requested' });
  }

  @Post('topup/:transferId/approve')
  @Permissions('wallets:topup:approve')
  @ApiOperation({ summary: 'Approve a pending wallet topup' })
  @ApiBody({
    description:
      'Approve a pending wallet topup. Admin identity is derived from bearer token; do NOT include adminId.',
    schema: { type: 'object', properties: {} },
  })
  async approveTopup(
    @Param('transferId') transferId: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'user') {
      return handleSuccessOne({ data: null, message: 'Forbidden' });
    }
    const result = await this.service.approveTopup({
      transferId,
      adminId: user.sub,
    });
    return handleSuccessOne({ data: result, message: 'Topup approved' });
  }

  @Post('topup/:transferId/reject')
  @Permissions('wallets:topup:reject')
  @ApiOperation({ summary: 'Reject a pending wallet topup' })
  @ApiBody({
    description:
      'Reject a pending wallet topup. Admin identity is derived from bearer token; send optional reason only.',
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Slip amount mismatch' },
      },
    },
  })
  async rejectTopup(
    @Param('transferId') transferId: string,
    @Body(ValidationPipe) body: RejectTopupDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'user') {
      return handleSuccessOne({ data: null, message: 'Forbidden' });
    }
    const transfer = await this.service.rejectTopup({
      transferId,
      adminId: user.sub,
      reason: body.reason,
    });
    return handleSuccessOne({ data: transfer, message: 'Topup rejected' });
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CustomersService } from '../customers/customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { handleSuccessOne } from '../../common/utils/response.util';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { CustomerServiceType } from '../customers/entities/customer-service.entity';
import { RequiresService } from '../../common/decorators/requires-service.decorator';
import { RequiredServiceGuard } from '../../common/guards/required-service.guard';

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
  constructor(
    private readonly service: WalletsService,
    private readonly customersService: CustomersService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet (customer authenticated)' })
  async getMyWallet(@AuthUser() user: JwtPayload) {
    console.log({ user });
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
  @ApiOperation({ summary: 'Request a wallet topup (customer)' })
  @UseGuards(RequiredServiceGuard)
  @RequiresService(CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT)
  @ApiBody({
    description:
      'Submit a topup request. Amount is required. Optionally attach a payment slip URL or reference.',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 100.5, description: 'Topup amount' },
        payment_slip: {
          type: 'string',
          nullable: true,
          example: 'https://cdn.example.com/slips/topup-2025-01-15.jpg',
          description: 'Optional payment slip URL/reference',
        },
      },
      required: ['amount'],
      example: {
        amount: 250.0,
        payment_slip: 'https://cdn.example.com/slips/topup-ABCD1234.jpg',
      },
    },
  })
  async requestTopup(
    @Body(ValidationPipe) dto: RequestTopupDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'customer') {
      return handleSuccessOne({ data: null, message: 'Unauthorized' });
    }
    // Require approved INTERNATIONAL_STOCK_ACCOUNT service before allowing topups
    const services = (await this.customersService.listServices(
      user.sub,
    )) as Array<{ service_type: CustomerServiceType; active?: boolean }>;
    const hasInternationalAccount = Array.isArray(services)
      ? services.some(
          (s) =>
            s.service_type ===
              CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT &&
            s.active === true,
        )
      : false;
    if (!hasInternationalAccount) {
      throw new ForbiddenException(
        'International stock account not active. Please apply and get approved before topping up.',
      );
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
  @ApiParam({
    name: 'transferId',
    description: 'Pending transfer ID to approve',
    example: 'e9e6e6aa-62d3-4b1a-8f7f-2f8c4a1bf111',
  })
  @ApiBody({
    description:
      'Approve a pending wallet topup. Admin identity is derived from bearer token; do NOT include adminId.',
    schema: { type: 'object', properties: {} },
    examples: {
      approve: {
        summary: 'Simple approval (no body fields required)',
        value: {},
      },
    },
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
  @ApiParam({
    name: 'transferId',
    description: 'Pending transfer ID to reject',
    example: 'e9e6e6aa-62d3-4b1a-8f7f-2f8c4a1bf111',
  })
  @ApiBody({
    description:
      'Reject a pending wallet topup. Admin identity is derived from bearer token; send optional reason only.',
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Slip amount mismatch' },
      },
    },
    examples: {
      missingSlip: {
        summary: 'Reject due to missing/invalid slip',
        value: { reason: 'Slip unreadable or missing required details' },
      },
      mismatch: {
        summary: 'Reject due to amount mismatch',
        value: { reason: 'Slip amount does not match requested topup' },
      },
    },
  })
  async rejectTopup(
    @Param('transferId') transferId: string,
    @Body(ValidationPipe) body: RejectTopupDto,
    @AuthUser() user: JwtPayload,
  ) {
    console.log({ user });
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

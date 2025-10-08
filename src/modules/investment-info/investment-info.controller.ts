import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { InvestmentInfoService } from './investment-info.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { handleSuccessMany } from '../../common/utils/response.util';
import type { JwtPayload } from '../../common/interfaces';

class ApproveInvestmentDto {
  // admin id now derived from auth token
  profit?: number;
}
class RejectInvestmentDto {
  // admin id now derived from auth token
  note?: string;
}

class RequestGuaranteedReturnsDto {
  amount: number;
}

class ListInvestmentsQueryDto {
  status?: string; // raw string, validated lightly in controller
  page?: number;
  limit?: number;
}

@ApiTags('investment-info')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investment-info')
export class InvestmentInfoController {
  constructor(private readonly service: InvestmentInfoService) {}

  // Admin list investments (guaranteed returns) with optional status filter
  @Get('guaranteed-returns')
  @Permissions('investment-info:list')
  @ApiOperation({
    summary: 'List guaranteed returns investment requests (admin)',
    description:
      'Returns investment requests optionally filtered by status. Supported statuses: pending, investing, rejected, completed.',
  })
  @ApiQuery({ name: 'status', required: false, example: 'pending' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async listGuaranteedReturns(
    @Query() query: ListInvestmentsQueryDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'user') {
      throw new ForbiddenException('Only admins can list investments');
    }
    // Basic status validation (optional)
    const allowedStatuses = [
      'pending',
      'investing',
      'rejected',
      'completed',
      'cancelled',
    ];
    if (query.status && !allowedStatuses.includes(query.status)) {
      throw new BadRequestException('Invalid status filter');
    }
    const result = await this.service.listGuaranteedReturns({
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'Guaranteed returns investments fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Post('guaranteed-returns')
  @Permissions('investment-info:request')
  @ApiOperation({
    summary: 'Request a guaranteed returns investment (customer)',
  })
  @ApiBody({
    description:
      'Create a pending guaranteed returns investment request. Amount must be <= current wallet balance. No funds are deducted until admin approval.',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          example: 5000,
          description: 'Investment principal (USD)',
        },
      },
      required: ['amount'],
      example: {
        amount: 5000,
      },
    },
  })
  async requestGuaranteedReturns(
    @Body() body: RequestGuaranteedReturnsDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'customer') {
      throw new ForbiddenException('Only customers can request investments');
    }
    if (body.amount == null) {
      throw new BadRequestException('Amount is required');
    }
    return this.service.requestGuaranteedReturnsInvestment(
      user.sub,
      body.amount,
    );
  }

  @Post(':id/approve')
  @Permissions('investment-info:approve')
  @ApiOperation({ summary: 'Approve pending investment request' })
  @ApiBody({
    description:
      'Approve a pending guaranteed returns investment. Admin user is taken from the bearer token; do NOT send adminId in body.',
    schema: {
      type: 'object',
      properties: {
        profit: {
          type: 'number',
          nullable: true,
          example: 0,
          description: 'Optional initial profit value (usually 0)',
        },
      },
      example: {
        profit: 0,
      },
    },
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApproveInvestmentDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'user') {
      throw new ForbiddenException('Only admins can approve investments');
    }
    return this.service.approve(id, user.sub);
  }

  @Post(':id/reject')
  @Permissions('investment-info:reject')
  @ApiOperation({ summary: 'Reject pending investment request' })
  @ApiBody({
    description:
      'Reject a pending guaranteed returns investment request. Admin user is taken from the bearer token; do NOT send adminId in body.',
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string', example: 'Incomplete documentation provided' },
      },
      example: {
        note: 'Incomplete documentation provided',
      },
    },
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectInvestmentDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (!user || user.type !== 'user') {
      throw new ForbiddenException('Only admins can reject investments');
    }
    return this.service.reject(id, user.sub, body.note);
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtCustomerAuthGuard } from '../../../modules/auth/guards/jwt-customer.guard';
import { StockPicksService } from '../services/stock-picks.service';
import {
  StockPickFilterDto,
  CustomerStockPickFilterDto,
  CustomerViewStockPickDto,
  CustomerStockPickResponseDto,
  CustomerSubmitPaymentSlipDto,
} from '../dto/stock-picks.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../../common/interfaces';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../../common/utils/response.util';

@ApiTags('Customer Stock Picks')
@Controller('stock-picks')
@UseGuards(JwtCustomerAuthGuard)
@ApiBearerAuth()
export class CustomerStockPicksController {
  constructor(private readonly stockPicksService: StockPicksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get available stock picks for customer',
    description:
      'Get all stock picks available to customers. Shows ALL stock picks regardless of service type or status. Only shows active and available picks. Stock symbols are hidden for security.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-1000)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (1-50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Available stock picks retrieved successfully',
    type: [CustomerViewStockPickDto],
  })
  async getAvailableStockPicks(
    @Query(ValidationPipe) filterDto: CustomerStockPickFilterDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can view stock picks');
    }

    // Convert customer filter to internal filter with customer-safe defaults
    const internalFilter: StockPickFilterDto = {
      page: filterDto.page,
      limit: filterDto.limit,
      // Only show active picks for customers
      is_active: true,
      // No availability filtering - customers see all availability statuses (available, taken, expired)
      // No status filtering - customers see all statuses
    };

    const result = await this.stockPicksService.getAvailablePicksForCustomer(
      user.sub,
      internalFilter,
    );

    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Available stock picks retrieved successfully',
    });
  }

  @Get('my-selections')
  @ApiOperation({
    summary: 'Get customer stock pick selections',
    description:
      'Get list of stock picks selected by the authenticated customer',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer selections retrieved successfully',
    type: [CustomerStockPickResponseDto],
  })
  async getMySelections(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can view their selections');
    }

    const result = await this.stockPicksService.getCustomerSelections(
      user.sub,
      page,
      limit,
    );

    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Your stock pick selections retrieved successfully',
    });
  }

  @Get('my-selections/:id')
  @ApiOperation({
    summary: 'Get specific customer stock pick selection',
    description: 'Get detailed information about a specific selection',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer stock pick ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Selection details retrieved successfully',
    type: CustomerStockPickResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Selection not found',
  })
  async getSelectionDetails(
    @Param('id') id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can view their selections');
    }

    // Get all customer selections and find the specific one
    const allSelections = await this.stockPicksService.getCustomerSelections(
      user.sub,
      1,
      1000, // Get all to find the specific one
    );

    const selection = allSelections.data.find((s) => s.id === id);

    if (!selection) {
      throw new ForbiddenException(
        'Selection not found or you do not have permission to view it',
      );
    }

    return handleSuccessOne({
      data: selection,
      message: 'Selection details retrieved successfully',
    });
  }

  @Post('selections/:id/payment-slip')
  @ApiOperation({
    summary: 'Submit payment slip for stock pick',
    description:
      'Submit payment slip for a selected stock pick. Required before admin approval.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer stock pick selection ID',
  })
  @ApiBody({
    type: CustomerSubmitPaymentSlipDto,
    description: 'Payment slip information',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment slip submitted successfully',
    type: CustomerStockPickResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or pick not in selected status',
  })
  @ApiResponse({
    status: 404,
    description: 'Pick not found or access denied',
  })
  async submitPaymentSlip(
    @Param('id') id: string,
    @Body(ValidationPipe) paymentSlipDto: CustomerSubmitPaymentSlipDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'customer') {
      throw new ForbiddenException('Only customers can submit payment slips');
    }

    const result = await this.stockPicksService.submitPaymentSlip(
      user.sub,
      id,
      paymentSlipDto,
    );

    return handleSuccessOne({
      data: result,
      message: 'Payment slip submitted successfully',
    });
  }
}

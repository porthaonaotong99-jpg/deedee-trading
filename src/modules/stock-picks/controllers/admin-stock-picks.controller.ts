import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
  ParseUUIDPipe,
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
import { JwtUserAuthGuard } from '../../../modules/auth/guards/jwt-user.guard';
import { StockPicksService } from '../services/stock-picks.service';
import {
  CreateStockPickDto,
  UpdateStockPickDto,
  StockPickFilterDto,
  AdminApprovePickDto,
  StockPickResponseDto,
  CustomerStockPickResponseDto,
} from '../dto/stock-picks.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../../common/interfaces';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../../common/utils/response.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { buildStockPickApprovalNotification } from '../../notifications/utils/notification-builders';

@ApiTags('Admin Stock Picks')
@Controller('admin/stock-picks')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class AdminStockPicksController {
  constructor(
    private readonly stockPicksService: StockPicksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new stock pick (Admin only)',
    description: 'Create a new stock pick that customers can select from',
  })
  @ApiBody({ type: CreateStockPickDto })
  @ApiResponse({
    status: 200,
    description: 'Stock pick created successfully',
    type: StockPickResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async createStockPick(
    @Body(ValidationPipe) createDto: CreateStockPickDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can create stock picks');
    }

    const stockPick = await this.stockPicksService.createStockPick(
      createDto,
      user.sub,
    );

    return handleSuccessOne({
      data: stockPick,
      message: 'Stock pick created successfully',
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all stock picks (Admin only)',
    description: 'Get paginated list of all stock picks with filtering options',
  })
  @ApiQuery({
    name: 'service_type',
    required: false,
    description: 'Filter by service type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by stock pick status',
  })
  @ApiQuery({
    name: 'availability',
    required: false,
    description: 'Filter by availability',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
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
    description: 'Stock picks retrieved successfully',
  })
  async getAllStockPicks(
    @Query(ValidationPipe) filterDto: StockPickFilterDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can view all stock picks');
    }

    const result = await this.stockPicksService.getAllStockPicks(filterDto);

    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Stock picks retrieved successfully',
    });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a stock pick (Admin only)',
    description: 'Update an existing stock pick',
  })
  @ApiParam({
    name: 'id',
    description: 'Stock pick ID',
  })
  @ApiBody({ type: UpdateStockPickDto })
  @ApiResponse({
    status: 200,
    description: 'Stock pick updated successfully',
    type: StockPickResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Stock pick not found',
  })
  async updateStockPick(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateStockPickDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can update stock picks');
    }

    const stockPick = await this.stockPicksService.updateStockPick(
      id,
      updateDto,
    );

    return handleSuccessOne({
      data: stockPick,
      message: 'Stock pick updated successfully',
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a stock pick (Admin only)',
    description: 'Delete an existing stock pick',
  })
  @ApiParam({
    name: 'id',
    description: 'Stock pick ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock pick deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Stock pick not found',
  })
  async deleteStockPick(@Param('id') id: string, @AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can delete stock picks');
    }

    await this.stockPicksService.deleteStockPick(id);

    return handleSuccessOne({
      data: { id },
      message: 'Stock pick deleted successfully',
    });
  }

  @Get('customer-picks')
  @ApiOperation({
    summary: 'Get customer picks (Admin only)',
    description: 'Get list of customer stock picks with optional status filter',
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
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description:
      'Filter by status (payment_submitted, approved, rejected, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer picks retrieved successfully',
  })
  async getPendingApprovals(
    @AuthUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can view customer picks');
    }

    const result = await this.stockPicksService.getPendingApprovals(
      page,
      limit,
      status,
    );

    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Pending approvals retrieved successfully',
    });
  }

  @Post('customer-picks/:id/approve')
  @ApiOperation({
    summary: 'Approve customer stock pick (Admin only)',
    description:
      'Approve a customer stock pick selection and send stock details via email',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer stock pick ID',
  })
  @ApiBody({ type: AdminApprovePickDto })
  @ApiResponse({
    status: 200,
    description: 'Customer pick approved successfully',
    type: CustomerStockPickResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer pick not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Customer pick is not in selected status',
  })
  async approveCustomerPick(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(ValidationPipe) approveDto: AdminApprovePickDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admin users can approve customer picks',
      );
    }

    const result = await this.stockPicksService.approveCustomerPick(
      id,
      user.sub,
      approveDto,
    );

    // Send notification to customer for stock pick approval/rejection
    const customerId = result.customer_id;
    const approved = approveDto.approve !== false;
    if (customerId) {
      await this.notificationsService.createNotification(
        buildStockPickApprovalNotification(
          { customerId },
          { adminId: user.sub, adminName: user.username },
          id,
          approved,
          approveDto.admin_response,
        ),
      );
    }

    return handleSuccessOne({
      data: result,
      message:
        approveDto.approve !== false
          ? 'Customer pick approved and email sent successfully'
          : 'Customer pick rejected successfully',
    });
  }

  @Post('customer-picks/:id/reject')
  @ApiOperation({
    summary: 'Reject customer stock pick (Admin only)',
    description: 'Reject a customer stock pick selection',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer stock pick ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        admin_response: {
          type: 'string',
          description: 'Reason for rejection',
          example: 'Stock no longer available due to market conditions',
        },
      },
      required: ['admin_response'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer pick rejected successfully',
    type: CustomerStockPickResponseDto,
  })
  async rejectCustomerPick(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { admin_response: string },
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admin users can reject customer picks',
      );
    }

    const result = await this.stockPicksService.approveCustomerPick(
      id,
      user.sub,
      {
        admin_response: body.admin_response,
        approve: false,
      },
    );

    // Send notification to customer for stock pick rejection
    const customerId = result.customer_id;
    if (customerId) {
      await this.notificationsService.createNotification(
        buildStockPickApprovalNotification(
          { customerId },
          { adminId: user.sub, adminName: user.username },
          id,
          false,
          body.admin_response,
        ),
      );
    }

    return handleSuccessOne({
      data: result,
      message: 'Customer pick rejected successfully',
    });
  }

  @Get('customer-picks/stats')
  @ApiOperation({
    summary: 'Get customer picks statistics (Admin only)',
    description: 'Get count of picks by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getCustomerPicksStats(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user') {
      throw new ForbiddenException('Only admin users can view statistics');
    }

    const stats = await this.stockPicksService.getCustomerPicksStats();

    return handleSuccessOne({
      data: stats,
      message: 'Statistics retrieved successfully',
    });
  }
}

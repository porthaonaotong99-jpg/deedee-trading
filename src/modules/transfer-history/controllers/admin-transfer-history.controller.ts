import {
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ForbiddenException,
  Put,
} from '@nestjs/common';
import { Controller } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TransferHistoryService } from '../transfer-history.service';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../../common/utils/response.util';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { NotificationsService } from '../../notifications/notifications.service';
import { buildTopUpApprovalNotification } from '../../notifications/utils/notification-builders';
import type { JwtPayload } from '../../../common/interfaces';
import { JwtUserAuthGuard } from '../../auth/guards/jwt-user.guard';

@ApiTags('Admin Transfer History')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('admin/transfer-history')
export class AdminTransferHistoryController {
  constructor(
    private readonly service: TransferHistoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all transfers (paginated, admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort field',
    example: 'created_at',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description:
      'Filter by created_at start date (inclusive). YYYY-MM-DD or ISO',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Filter by created_at end date (inclusive). YYYY-MM-DD or ISO',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({
    name: 'identify',
    required: false,
    description: 'Filter by transfer type',
    enum: [
      'recharge',
      'withdraw',
      'invest',
      'call_payment',
      'video_payment',
      'chat_payment',
    ],
  })
  async findAll(
    @AuthUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('status') status?: string,
    @Query('identify') identify?: string,
  ) {
    if (user.type !== 'user')
      throw new ForbiddenException('Invalid token type for user route');

    let parsedStart = start_date ? new Date(start_date) : undefined;
    let parsedEnd = end_date ? new Date(end_date) : undefined;
    if (parsedStart && Number.isNaN(parsedStart.getTime()))
      parsedStart = undefined;
    if (parsedEnd && Number.isNaN(parsedEnd.getTime())) parsedEnd = undefined;
    const result = await this.service.findAll(query, {
      startDate: parsedStart,
      endDate: parsedEnd,
      status,
      identify,
    });
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Transfers fetched',
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transfer statistics by status (admin)' })
  async getStats(@AuthUser() user: JwtPayload) {
    if (user.type !== 'user')
      throw new ForbiddenException('Invalid token type for user route');

    const stats = await this.service.getStats();
    return handleSuccessOne({ data: stats, message: 'Stats retrieved' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by id (admin)' })
  @ApiParam({ name: 'id', description: 'Transfer history id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Transfer found' });
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve transfer (admin)' })
  @ApiParam({ name: 'id', description: 'Transfer history id' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user')
      throw new ForbiddenException('Invalid token type for user route');

    const data = await this.service.approve(id, user.sub);

    // Send notification to customer for top-up approval
    const customerId = data.customer_id;
    const amount = Number(data.amount || 0);
    if (customerId) {
      await this.notificationsService.createNotification(
        buildTopUpApprovalNotification(
          { customerId },
          { adminId: user.sub, adminName: user.username },
          id,
          amount,
          true,
        ),
      );
    }

    return handleSuccessOne({ data, message: 'Transfer approved' });
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject transfer (admin)' })
  @ApiParam({ name: 'id', description: 'Transfer history id' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user')
      throw new ForbiddenException('Invalid token type for user route');

    const data = await this.service.reject(id, user.sub);

    // Send notification to customer for top-up rejection
    const customerId = data.customer_id;
    const amount = Number(data.amount || 0);
    if (customerId) {
      await this.notificationsService.createNotification(
        buildTopUpApprovalNotification(
          { customerId },
          { adminId: user.sub, adminName: user.username },
          id,
          amount,
          false,
          'Transfer rejected',
        ),
      );
    }

    return handleSuccessOne({ data, message: 'Transfer rejected' });
  }
}

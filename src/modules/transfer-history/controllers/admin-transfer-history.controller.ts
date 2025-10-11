import {
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ForbiddenException,
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
import { JwtUserAuthGuard } from '../../auth/guards/jwt-user.guard';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../../common/utils/response.util';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../../common/interfaces';

@ApiTags('Admin Transfer History')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('admin/transfer-history')
export class AdminTransferHistoryController {
  constructor(private readonly service: TransferHistoryService) {}

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
  async findAll(
    @AuthUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by id (admin)' })
  @ApiParam({ name: 'id', description: 'Transfer history id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Transfer found' });
  }
}

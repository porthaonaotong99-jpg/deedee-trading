import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TransferHistoryService } from './transfer-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';

@ApiTags('transfer-history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transfer-history')
export class TransferHistoryController {
  constructor(private readonly service: TransferHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'List transfers (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAll(query);
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
  @ApiOperation({ summary: 'Get transfer by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Transfer found' });
  }
}

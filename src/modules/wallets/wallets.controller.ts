import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessOne,
} from '../../common/utils/response.util';

class CreateWalletDto {
  customerId!: string;
  balance?: number;
}
class UpdateWalletDto {
  balance?: number;
}

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly service: WalletsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('wallets:create')
  @ApiOperation({ summary: 'Create wallet' })
  @ApiBody({ type: CreateWalletDto })
  async create(@Body(ValidationPipe) dto: CreateWalletDto) {
    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'Wallet created',
      statusCode: 200,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List wallets (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAll(query);
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'Wallets fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Wallet found' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('wallets:update')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiBody({ type: UpdateWalletDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateWalletDto,
  ) {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'Wallet updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('wallets:delete')
  @ApiOperation({ summary: 'Delete wallet' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'Wallet deleted' });
  }
}

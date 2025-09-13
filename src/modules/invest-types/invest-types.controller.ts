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
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { InvestTypesService } from './invest-types.service';
import { CreateInvestTypeDto } from './dto/create-invest-type.dto';
import { UpdateInvestTypeDto } from './dto/update-invest-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessOne,
  handleSuccessMany,
  IOneResponse,
  IManyResponse,
} from '../../common/utils/response.util';

@ApiTags('invest-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invest-types')
export class InvestTypesController {
  constructor(private readonly service: InvestTypesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('invest-types:create')
  @ApiOperation({ summary: 'Create invest type' })
  @ApiBody({ type: CreateInvestTypeDto })
  @ApiResponse({ status: 200, description: 'Created' })
  async create(
    @Body(ValidationPipe) dto: CreateInvestTypeDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'InvestType created',
      statusCode: 200,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List invest types (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List returned' })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<
    IManyResponse<any> & { page: number; limit: number; totalPages: number }
  > {
    const result = await this.service.findAll(query);
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'InvestTypes fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invest type by id' })
  @ApiResponse({ status: 200, description: 'Found' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'InvestType found' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('invest-types:update')
  @ApiOperation({ summary: 'Update invest type' })
  @ApiBody({ type: UpdateInvestTypeDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateInvestTypeDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'InvestType updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('invest-types:delete')
  @ApiOperation({ summary: 'Delete invest type' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<null>> {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'InvestType deleted' });
  }
}

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
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BoundsService } from './bounds.service';
import { CreateBoundDto } from './dto/create-bound.dto';
import { UpdateBoundDto } from './dto/update-bound.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessOne,
  handleSuccessPaginated,
  IOneResponse,
  IPaginatedResponse,
} from '../../common/utils/response.util';

@ApiTags('bounds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bounds')
export class BoundsController {
  constructor(private readonly service: BoundsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('bounds:create')
  @ApiOperation({ summary: 'Create bound' })
  @ApiBody({ type: CreateBoundDto })
  @ApiResponse({ status: 200 })
  async create(
    @Body(ValidationPipe) dto: CreateBoundDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'Bound created',
      statusCode: 200,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List bounds (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<IPaginatedResponse<any>> {
    const result = await this.service.findAll(query);
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Bounds fetched',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bound by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Bound found' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('bounds:update')
  @ApiOperation({ summary: 'Update bound' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateBoundDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'Bound updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('bounds:delete')
  @ApiOperation({ summary: 'Delete bound' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<null>> {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'Bound deleted' });
  }
}

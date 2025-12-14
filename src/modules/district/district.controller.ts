import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { DistrictService } from './district.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { District } from './entities/district.entity';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Districts')
@Controller('districts')
export class DistrictController {
  constructor(private readonly districtService: DistrictService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('districts:create')
  @ApiOperation({ summary: 'Create a new district' })
  @ApiBody({ type: CreateDistrictDto })
  @ApiResponse({ status: 201, description: 'District created' })
  async create(@Body(ValidationPipe) dto: CreateDistrictDto) {
    const data = await this.districtService.create(dto);
    return handleSuccessOne({
      data,
      message: 'District created',
      statusCode: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List districts (optional province filter)' })
  @ApiQuery({ name: 'province_id', required: false })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('province_id') provinceId?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    const shouldPaginate =
      query.page !== undefined || query.limit !== undefined;

    if (shouldPaginate) {
      const paginated: PaginatedResult<District> =
        await this.districtService.findAllPaginated(query, {
          province_id: provinceId,
          includeInactive: includeInactive === 'true',
        });
      return handleSuccessPaginated({
        data: paginated.data,
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
      });
    }

    const data = await this.districtService.findAll({
      province_id: provinceId,
      includeInactive: includeInactive === 'true',
    });
    return handleSuccessMany({ data });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get district by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.districtService.findOne(id);
    return handleSuccessOne({ data, message: 'District found' });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('districts:update')
  @ApiOperation({ summary: 'Update district' })
  @ApiBody({ type: UpdateDistrictDto })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateDistrictDto,
  ) {
    const data = await this.districtService.update(id, dto);
    return handleSuccessOne({ data, message: 'District updated' });
  }
}

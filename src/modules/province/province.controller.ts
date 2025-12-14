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
import { ProvinceService } from './province.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { Province } from './entities/province.entity';
import type { PaginatedResult } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Provinces')
@Controller('provinces')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('provinces:create')
  @ApiOperation({ summary: 'Create a new province' })
  @ApiBody({ type: CreateProvinceDto })
  @ApiResponse({ status: 201, description: 'Province created' })
  async create(@Body(ValidationPipe) dto: CreateProvinceDto) {
    const data = await this.provinceService.create(dto);
    return handleSuccessOne({
      data,
      message: 'Province created',
      statusCode: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List provinces (optional country filter)' })
  @ApiQuery({ name: 'country_id', required: false })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('country_id') countryId?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    const shouldPaginate =
      query.page !== undefined || query.limit !== undefined;

    if (shouldPaginate) {
      const paginated: PaginatedResult<Province> =
        await this.provinceService.findAllPaginated(query, {
          country_id: countryId,
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

    const data = await this.provinceService.findAll({
      country_id: countryId,
      includeInactive: includeInactive === 'true',
    });
    return handleSuccessMany({ data });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get province by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.provinceService.findOne(id);
    return handleSuccessOne({ data, message: 'Province found' });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('provinces:update')
  @ApiOperation({ summary: 'Update province' })
  @ApiBody({ type: UpdateProvinceDto })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateProvinceDto,
  ) {
    const data = await this.provinceService.update(id, dto);
    return handleSuccessOne({ data, message: 'Province updated' });
  }
}

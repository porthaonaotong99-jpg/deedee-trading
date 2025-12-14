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
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessPaginated,
  handleSuccessOne,
} from '../../common/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('countries:create')
  @ApiOperation({ summary: 'Create a new country' })
  @ApiBody({ type: CreateCountryDto })
  @ApiResponse({ status: 201, description: 'Country created' })
  async create(@Body(ValidationPipe) dto: CreateCountryDto) {
    const data = await this.countryService.create(dto);
    return handleSuccessOne({
      data,
      message: 'Country created',
      statusCode: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List countries' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('include_inactive') includeInactive?: string,
  ) {
    const shouldPaginate =
      query.page !== undefined || query.limit !== undefined;

    if (shouldPaginate) {
      const paginated = await this.countryService.findAllPaginated(query, {
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

    const data = await this.countryService.findAll({
      includeInactive: includeInactive === 'true',
    });
    return handleSuccessMany({ data });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.countryService.findOne(id);
    return handleSuccessOne({ data, message: 'Country found' });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('countries:update')
  @ApiOperation({ summary: 'Update country' })
  @ApiBody({ type: UpdateCountryDto })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateCountryDto,
  ) {
    const data = await this.countryService.update(id, dto);
    return handleSuccessOne({ data, message: 'Country updated' });
  }
}

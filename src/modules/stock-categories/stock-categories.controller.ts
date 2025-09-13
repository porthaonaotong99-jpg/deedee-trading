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
import { StockCategoriesService } from './stock-categories.service';
import { CreateStockCategoryDto } from './dto/create-stock-category.dto';
import { UpdateStockCategoryDto } from './dto/update-stock-category.dto';
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

@ApiTags('stock-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-categories')
export class StockCategoriesController {
  constructor(private readonly service: StockCategoriesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('stock-categories:create')
  @ApiOperation({ summary: 'Create stock category' })
  @ApiBody({ type: CreateStockCategoryDto })
  @ApiResponse({ status: 200, description: 'Created' })
  async create(
    @Body(ValidationPipe) dto: CreateStockCategoryDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'StockCategory created',
      statusCode: 200,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List stock categories (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<
    IManyResponse<any> & { page: number; limit: number; totalPages: number }
  > {
    const result = await this.service.findAll(query);
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'StockCategories fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock category by id' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'StockCategory found' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stock-categories:update')
  @ApiOperation({ summary: 'Update stock category' })
  @ApiBody({ type: UpdateStockCategoryDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateStockCategoryDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'StockCategory updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stock-categories:delete')
  @ApiOperation({ summary: 'Delete stock category' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IOneResponse<null>> {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'StockCategory deleted' });
  }
}

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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessOne,
} from '../../common/utils/response.util';

class CreateCustomerDto {
  username!: string;
  email!: string;
  password!: string;
}
class UpdateCustomerDto {
  username?: string;
  email?: string;
  password?: string;
}

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('customers:create')
  @ApiOperation({ summary: 'Create customer' })
  @ApiBody({ type: CreateCustomerDto })
  async create(@Body(ValidationPipe) dto: CreateCustomerDto) {
    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'Customer created',
      statusCode: 200,
    });
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('customers:read')
  @ApiOperation({ summary: 'List customers (paginated) [staff only]' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAll(query);
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'Customers fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('customers:read')
  @ApiOperation({ summary: 'Get customer by id [staff only]' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Customer found' });
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Get current customer profile (self)' })
  async profile(@AuthUser() user: JwtPayload) {
    // Only allow when token type is customer
    if (user.type !== 'customer') {
      // Reuse 403 semantics without importing ForbiddenException to keep minimal; could import instead.
      throw new ForbiddenException();
    }
    const data = await this.service.findOne(user.sub);
    return handleSuccessOne({ data, message: 'Customer profile' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('customers:update')
  @ApiOperation({ summary: 'Update customer' })
  @ApiBody({ type: UpdateCustomerDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateCustomerDto,
  ) {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'Customer updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('customers:delete')
  @ApiOperation({ summary: 'Delete customer' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'Customer deleted' });
  }
}

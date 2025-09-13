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
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessMany,
  handleSuccessOne,
} from '../../common/utils/response.util';

class CreateRoleDto {
  name!: string;
}
class UpdateRoleDto {
  name?: string;
}

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Create role' })
  @ApiBody({ type: CreateRoleDto })
  async create(@Body(ValidationPipe) dto: CreateRoleDto) {
    const data = await this.service.create(dto);
    return handleSuccessOne({ data, message: 'Role created', statusCode: 200 });
  }

  @Get()
  @ApiOperation({ summary: 'List roles (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAll(query);
    const base = handleSuccessMany({
      data: result.data,
      total: result.total,
      message: 'Roles fetched',
    });
    return {
      ...base,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return handleSuccessOne({ data, message: 'Role found' });
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Update role' })
  @ApiBody({ type: UpdateRoleDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateRoleDto,
  ) {
    const data = await this.service.update(id, dto);
    return handleSuccessOne({ data, message: 'Role updated' });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles:delete')
  @ApiOperation({ summary: 'Delete role' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return handleSuccessOne({ data: null, message: 'Role deleted' });
  }
}

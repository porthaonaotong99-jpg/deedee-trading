import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { AdminSubscriptionPackagesService } from './admin-subscription-packages.service';
import {
  CreateSubscriptionPackageDto,
  UpdateSubscriptionPackageDto,
} from './dto/admin-subscription-packages.dto';
import { SubscriptionPackageFilterDto } from './dto/subscription-packages.dto';
import {
  handleSuccessOne,
  handleSuccessPaginated,
} from '../../common/utils/response.util';

@ApiTags('Admin Subscription Packages')
@ApiBearerAuth()
@Controller('admin/subscription-packages')
@UseGuards(JwtUserAuthGuard)
export class AdminSubscriptionPackagesController {
  constructor(private readonly service: AdminSubscriptionPackagesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('subscription-packages:create')
  @ApiOperation({ summary: 'Create a new subscription package' })
  @ApiBody({ type: CreateSubscriptionPackageDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription package created successfully',
  })
  async create(
    @Body(ValidationPipe) dto: CreateSubscriptionPackageDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can create subscription packages',
      );
    }

    const data = await this.service.create(dto);
    return handleSuccessOne({
      data,
      message: 'Subscription package created successfully',
      statusCode: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all subscription packages (admin)' })
  @ApiQuery({ name: 'service_type', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, description: 'Search text' })
  @ApiResponse({
    status: 200,
    description: 'Subscription packages list retrieved successfully',
  })
  async findAll(
    @Query(ValidationPipe) filter: SubscriptionPackageFilterDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can list subscription packages',
      );
    }

    const result = await this.service.findAll(filter);
    return handleSuccessPaginated({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      message: 'Subscription packages retrieved successfully',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription package by ID' })
  @ApiParam({ name: 'id', description: 'Subscription package ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription package retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription package not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can view subscription packages',
      );
    }

    const data = await this.service.findOne(id);
    if (!data) {
      throw new NotFoundException('Subscription package not found');
    }

    return handleSuccessOne({
      data,
      message: 'Subscription package retrieved successfully',
    });
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('subscription-packages:update')
  @ApiOperation({ summary: 'Update subscription package' })
  @ApiParam({ name: 'id', description: 'Subscription package ID' })
  @ApiBody({ type: UpdateSubscriptionPackageDto })
  @ApiResponse({
    status: 200,
    description: 'Subscription package updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription package not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateSubscriptionPackageDto,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can update subscription packages',
      );
    }

    const data = await this.service.update(id, dto);
    return handleSuccessOne({
      data,
      message: 'Subscription package updated successfully',
    });
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('subscription-packages:delete')
  @ApiOperation({ summary: 'Delete subscription package' })
  @ApiParam({ name: 'id', description: 'Subscription package ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription package deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription package not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can delete subscription packages',
      );
    }

    await this.service.remove(id);
    return handleSuccessOne({
      data: null,
      message: 'Subscription package deleted successfully',
    });
  }

  @Put(':id/toggle-active')
  @UseGuards(PermissionsGuard)
  @Permissions('subscription-packages:update')
  @ApiOperation({ summary: 'Toggle subscription package active status' })
  @ApiParam({ name: 'id', description: 'Subscription package ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription package status toggled successfully',
  })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: JwtPayload,
  ) {
    if (user.type !== 'user') {
      throw new ForbiddenException(
        'Only admins can toggle subscription package status',
      );
    }

    const data = await this.service.toggleActive(id);
    return handleSuccessOne({
      data,
      message: 'Subscription package status toggled successfully',
    });
  }
}

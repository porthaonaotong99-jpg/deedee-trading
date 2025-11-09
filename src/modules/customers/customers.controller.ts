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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import type { JwtPayload } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  handleSuccessPaginated,
  handleSuccessOne,
  IPaginatedResponse,
} from '../../common/utils/response.util';
import {
  ForgotPasswordDto,
  ResetPasswordWithOtpDto,
  ResetPasswordWithTokenDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './dto/password-reset.dto';

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
      message: 'Customers fetched',
    });
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
  async profile(@AuthUser() user: JwtPayload): Promise<any> {
    // Only allow when token type is customer
    if (user.type !== 'customer') {
      // Reuse 403 semantics without importing ForbiddenException to keep minimal; could import instead.
      throw new ForbiddenException();
    }
    const data = await this.service.findOneWithServices(user.sub);
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

  // --- Password Reset Endpoints ---

  @Post('forgot-password')
  @Public()
  @ApiOperation({
    summary: 'Send password reset instructions',
    description: 'Send OTP or reset link to customer email for password reset',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset instructions sent successfully',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or too many attempts',
  })
  async forgotPassword(
    @Body(ValidationPipe) dto: ForgotPasswordDto,
    @Req() req: { headers: Record<string, unknown>; ip?: string },
  ) {
    const context = {
      userAgent: req.headers['user-agent'] as string,
      ipAddress: req.ip,
    };

    const result = await this.service.forgotPassword(dto, context);
    return handleSuccessOne({
      data: result,
      message: 'Password reset instructions sent successfully',
    });
  }

  @Post('reset-password/otp')
  @Public()
  @ApiOperation({
    summary: 'Reset password using OTP',
    description: 'Reset password using the OTP code received via email',
  })
  @ApiBody({ type: ResetPasswordWithOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP, expired OTP, or validation error',
  })
  async resetPasswordWithOtp(
    @Body(ValidationPipe) dto: ResetPasswordWithOtpDto,
    @Req() req: { headers: Record<string, unknown>; ip?: string },
  ) {
    const context = {
      userAgent: req.headers['user-agent'] as string,
      ipAddress: req.ip,
    };

    const result = await this.service.resetPasswordWithOtp(dto, context);
    return handleSuccessOne({
      data: result,
      message: 'Password reset successfully',
    });
  }

  @Post('reset-password/token')
  @Public()
  @ApiOperation({
    summary: 'Reset password using reset token',
    description: 'Reset password using the reset token from email link',
  })
  @ApiBody({ type: ResetPasswordWithTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token, expired token, or validation error',
  })
  async resetPasswordWithToken(
    @Body(ValidationPipe) dto: ResetPasswordWithTokenDto,
    @Req() req: { headers: Record<string, unknown>; ip?: string },
  ) {
    const context = {
      userAgent: req.headers['user-agent'] as string,
      ipAddress: req.ip,
    };

    const result = await this.service.resetPasswordWithToken(dto, context);
    return handleSuccessOne({
      data: result,
      message: 'Password reset successfully',
    });
  }
}

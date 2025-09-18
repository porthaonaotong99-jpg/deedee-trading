import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  AuthCustomerRegisterRequestExample,
  AuthCustomerRegisterResponseExample,
  AuthLoginUserRequestExample,
  AuthLoginUserResponseExample,
  AuthLoginCustomerRequestExample,
  AuthLoginCustomerResponseExample,
} from '../../docs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, CustomerLoginDto, LoginResponseDto } from './dto/auth.dto';
import {
  CustomerRegisterDto,
  CustomerRegisterResponseDto,
} from './dto/register.dto';
import {
  handleSuccessOne,
  IOneResponse,
} from '../../common/utils/response.util';
import { RefreshTokenDto } from './dto/session.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('customer/register')
  @ApiOperation({ summary: 'Register new customer account' })
  @ApiBody({
    description: 'Customer registration payload',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        address: { type: 'string' },
      },
      example: AuthCustomerRegisterRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Customer created',
    type: CustomerRegisterResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer created (example)',
    schema: { example: AuthCustomerRegisterResponseExample },
  })
  @ApiResponse({ status: 409, description: 'Username or email already taken' })
  async registerCustomer(
    @Body(ValidationPipe) dto: CustomerRegisterDto,
  ): Promise<IOneResponse<CustomerRegisterResponseDto>> {
    const data = await this.authService.registerCustomer(dto);
    return handleSuccessOne({
      data,
      message: 'Customer registered',
      statusCode: 200,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Admin/User login' })
  @ApiBody({
    description: 'Credentials for admin/user login',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
      example: AuthLoginUserRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: { example: AuthLoginUserResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async loginUser(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<IOneResponse<LoginResponseDto>> {
    const data = await this.authService.loginUser(loginDto);
    return handleSuccessOne({
      data,
      message: 'Login successful',
      statusCode: 200,
    });
  }

  @Post('customer/login')
  @ApiOperation({ summary: 'Customer login' })
  @ApiBody({
    description: 'Credentials for customer login',
    schema: ((): Record<string, unknown> => ({
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
      example: AuthLoginCustomerRequestExample,
    }))(),
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: { example: AuthLoginCustomerResponseExample },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async loginCustomer(
    @Body(ValidationPipe) loginDto: CustomerLoginDto,
    @Req()
    req: {
      headers: Record<string, unknown>;
      ip?: string;
      connection?: { remoteAddress?: string };
    },
  ): Promise<IOneResponse<LoginResponseDto>> {
    const headers = req.headers || {};
    const userAgent = headers['user-agent'] as string | undefined;
    const forwarded = headers['x-forwarded-for'] as string | undefined;
    const ipHeader = forwarded ? forwarded.split(',')[0].trim() : undefined;
    const ip = ipHeader || req.ip || req.connection?.remoteAddress || undefined;
    const providedDeviceId = headers['x-device-id'] as string | undefined;
    const providedDeviceName = headers['x-device-name'] as string | undefined;
    const data = await this.authService.loginCustomer(loginDto, {
      userAgent,
      ipAddress: ip,
      providedDeviceId,
      providedDeviceName,
    });
    return handleSuccessOne({
      data,
      message: 'Login successful',
      statusCode: 200,
    });
  }

  @Post('customer/refresh')
  @ApiOperation({ summary: 'Rotate refresh token & issue new access token' })
  async refresh(
    @Body(ValidationPipe) dto: RefreshTokenDto,
  ): Promise<IOneResponse<any>> {
    const data = await this.authService.refreshCustomerToken(
      dto.session_id,
      dto.refresh_token,
    );
    return handleSuccessOne({
      data,
      message: 'Token refreshed',
      statusCode: 200,
    });
  }

  @Get('customer/sessions/:customerId')
  @ApiOperation({
    summary: 'List customer sessions (temporary - secure later)',
  })
  async listSessions(@Param('customerId') customerId: string) {
    const data = await this.authService.listCustomerSessions(customerId);
    return handleSuccessOne({
      data,
      message: 'Sessions fetched',
      statusCode: 200,
    });
  }

  @Post('customer/sessions/:customerId/revoke/:sessionId')
  @ApiOperation({
    summary: 'Revoke one session (temporary - secure later)',
  })
  async revokeSession(
    @Param('customerId') customerId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const data = await this.authService.revokeCustomerSession(
      customerId,
      sessionId,
    );
    return handleSuccessOne({
      data,
      message: 'Session revoked',
      statusCode: 200,
    });
  }

  @Post('customer/sessions/:customerId/revoke-others/:currentSessionId')
  @ApiOperation({
    summary: 'Revoke other sessions except current (temporary)',
  })
  async revokeOthers(
    @Param('customerId') customerId: string,
    @Param('currentSessionId') currentSessionId: string,
  ) {
    const data = await this.authService.revokeOtherCustomerSessions(
      customerId,
      currentSessionId,
    );
    return handleSuccessOne({
      data,
      message: 'Other sessions revoked',
      statusCode: 200,
    });
  }

  @Post('customer/sessions/:customerId/revoke-all')
  @ApiOperation({ summary: 'Revoke all sessions (temporary)' })
  async revokeAll(@Param('customerId') customerId: string) {
    const data = await this.authService.revokeAllCustomerSessions(customerId);
    return handleSuccessOne({
      data,
      message: 'All sessions revoked',
      statusCode: 200,
    });
  }
}

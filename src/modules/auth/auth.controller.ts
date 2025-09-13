import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('customer/register')
  @ApiOperation({ summary: 'Register new customer account' })
  @ApiBody({
    description: 'Customer registration payload',
    schema: {
      example: {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'CustStr0ng!1',
        first_name: 'John',
        last_name: 'Doe',
        address: '123 Market St',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer created',
    type: CustomerRegisterResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer created (example)',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Customer registered',
        data: {
          id: '6d1f2e1a-b123-4c89-9d10-aaaaaaaaaaaa',
          username: 'johndoe',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          wallet_id: '0f9c2d34-7a1b-4c56-9a12-bbbbbbbbbbbb',
        },
        error: null,
        status_code: 200,
      },
    },
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
    schema: {
      example: {
        username: 'admin',
        password: 'P@ssw0rd!',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Login successful',
        data: {
          access_token: 'xxx.yyy.zzz',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'uuid', username: 'admin', role: 'admin' },
        },
        error: null,
        status_code: 200,
      },
    },
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
    description: 'Credentials for admin/user login',
    schema: {
      example: {
        email: 'john@example.com',
        password: 'CustStr0ng!1',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        is_error: false,
        code: 'SUCCESS',
        message: 'Login successful',
        data: {
          access_token: 'xxx.yyy.zzz',
          token_type: 'bearer',
          expires_in: 3600,
          customer: {
            id: 'uuid',
            username: 'john_doe',
            email: 'john@example.com',
          },
        },
        error: null,
        status_code: 200,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async loginCustomer(
    @Body(ValidationPipe) loginDto: CustomerLoginDto,
  ): Promise<IOneResponse<LoginResponseDto>> {
    const data = await this.authService.loginCustomer(loginDto);
    return handleSuccessOne({
      data,
      message: 'Login successful',
      statusCode: 200,
    });
  }
}

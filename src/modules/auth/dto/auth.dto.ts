import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'Username for admin/user login',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'User password (min 6 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class CustomerLoginDto {
  @ApiPropertyOptional({
    example: 'johndoe',
    description: 'Customer username (optional if email is provided)',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Customer email (optional if username is provided)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'CustP@ss1',
    description: 'Customer password (min 6 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

@ValidatorConstraint({ name: 'UsernameOrEmail', async: false })
class UsernameOrEmailConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { username?: string; email?: string };
    return !!(obj.username || obj.email);
  }
  defaultMessage(): string {
    return 'Either username or email must be provided';
  }
}

// Re-open the class to attach the class-level validator without changing field decorators order.
// (Alternative would be to add @Validate directly above a dummy property.)
Validate(UsernameOrEmailConstraint)(CustomerLoginDto.prototype, 'username');

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;
  @ApiProperty({
    example: 'bearer',
    description: 'Token type',
  })
  token_type: string;
  @ApiProperty({
    example: 3600,
    description: 'Token expiration in seconds',
  })
  expires_in: number;
  @ApiPropertyOptional({
    example: {
      id: 'c6c1a9c8-1234-4d7b-9f10-111111111111',
      username: 'admin',
      role: 'admin',
    },
    description: 'Returned when logging in as an admin/user',
  })
  user?: {
    id: string;
    username: string;
    role?: string;
  };
  @ApiPropertyOptional({
    example: {
      id: '9b4e0e04-aaaa-4fa9-bbbb-222222222222',
      username: 'john_doe',
      email: 'john@example.com',
    },
    description: 'Returned when logging in as a customer',
  })
  customer?: {
    id: string;
    username?: string;
    email?: string;
  };
}

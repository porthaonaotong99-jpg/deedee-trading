import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// Customer registration DTO (no admin role handling)
export class CustomerRegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Desired username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'john@example.com', description: 'Customer email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'CustStr0ng!1',
    description: 'Password (min 6 chars)',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({ example: '123 Market St', description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class CustomerRegisterResponseDto {
  @ApiProperty({ example: '6d1f2e1a-b123-4c89-9d10-aaaaaaaaaaaa' })
  id!: string;
  @ApiProperty({ example: 'johndoe' })
  username!: string;
  @ApiProperty({ example: 'john@example.com' })
  email!: string;
  @ApiPropertyOptional({ example: 'John' })
  first_name?: string;
  @ApiPropertyOptional({ example: 'Doe' })
  last_name?: string;
  @ApiProperty({
    example: '0f9c2d34-7a1b-4c56-9a12-bbbbbbbbbbbb',
    description: 'Associated wallet id',
  })
  wallet_id!: string;
}

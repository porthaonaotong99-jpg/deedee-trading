import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'session-uuid', description: 'Session ID (sid)' })
  @IsString()
  @IsNotEmpty()
  session_id!: string;

  @ApiProperty({
    example: 'base64url-refresh-token',
    description: 'Refresh token issued for this session',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

export class RevokeSessionDto {
  @ApiProperty({
    example: 'session-uuid',
    description: 'Session ID to revoke (if not using param)',
  })
  @IsString()
  @IsNotEmpty()
  session_id!: string;
}

export class CustomerSessionDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  customer_id!: string;
  @ApiProperty({ required: false })
  user_agent?: string;
  @ApiProperty({ required: false })
  ip_address?: string;
  @ApiProperty({ required: false })
  device_id?: string;
  @ApiProperty({ required: false })
  device_name?: string;
  @ApiProperty()
  refresh_expires_at!: Date;
  @ApiProperty({ required: false })
  last_activity_at?: Date;
  @ApiProperty({ required: false })
  revoked_at?: Date;
  @ApiProperty({ required: false })
  revoked_reason?: string;
  @ApiProperty({ required: false })
  created_at!: Date;
  @ApiProperty({ required: false })
  updated_at!: Date;
}

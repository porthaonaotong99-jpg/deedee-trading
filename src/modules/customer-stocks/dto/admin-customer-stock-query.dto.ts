import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminCustomerStockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by stock ID' })
  @IsUUID()
  @IsOptional()
  stock_id?: string;
}

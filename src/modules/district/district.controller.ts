import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DistrictService } from './district.service';

@ApiTags('Districts')
@Controller('districts')
export class DistrictController {
  constructor(private readonly districtService: DistrictService) {}

  @Get()
  @ApiOperation({ summary: 'List districts (optional province filter)' })
  @ApiQuery({ name: 'province_id', required: false })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async list(
    @Query('province_id') provinceId?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.districtService.findAll({
      province_id: provinceId,
      includeInactive: includeInactive === 'true',
    });
  }
}

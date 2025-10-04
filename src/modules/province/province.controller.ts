import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProvinceService } from './province.service';

@ApiTags('Provinces')
@Controller('provinces')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  @ApiOperation({ summary: 'List provinces (optional country filter)' })
  @ApiQuery({ name: 'country_id', required: false })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async list(
    @Query('country_id') countryId?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.provinceService.findAll({
      country_id: countryId,
      includeInactive: includeInactive === 'true',
    });
  }
}

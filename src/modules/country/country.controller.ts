import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CountryService } from './country.service';

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiOperation({ summary: 'List countries' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  list(@Query('include_inactive') includeInactive?: string) {
    return this.countryService.findAll({
      includeInactive: includeInactive === 'true',
    });
  }
}

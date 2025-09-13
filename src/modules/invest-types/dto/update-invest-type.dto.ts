import { PartialType } from '@nestjs/swagger';
import { CreateInvestTypeDto } from './create-invest-type.dto';

export class UpdateInvestTypeDto extends PartialType(CreateInvestTypeDto) {}

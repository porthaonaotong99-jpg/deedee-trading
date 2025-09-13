import { PartialType } from '@nestjs/swagger';
import { CreateBoundDto } from './create-bound.dto';

export class UpdateBoundDto extends PartialType(CreateBoundDto) {}

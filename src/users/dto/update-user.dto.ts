import { PartialType, OmitType } from '@nestjs/swagger';
import { RegisterDto } from '../../auth/dto/register.dto';

export class UpdateUserDto extends PartialType(
  OmitType(RegisterDto, ['email', 'password'] as const),
) {}

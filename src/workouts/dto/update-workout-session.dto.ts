import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class UpdateWorkoutSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exercise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  formScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

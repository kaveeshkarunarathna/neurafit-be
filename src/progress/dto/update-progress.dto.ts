import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bodyFat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  muscleMass?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sleepHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  waterIntake?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  steps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

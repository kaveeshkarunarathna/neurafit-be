import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogProgressDto {
  @ApiPropertyOptional({ example: 72.5, description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional({ example: 18.5, description: 'Body fat percentage' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  bodyFat?: number;

  @ApiPropertyOptional({ example: 38.2, description: 'Muscle mass in kg' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  muscleMass?: number;

  @ApiPropertyOptional({ example: 7.5, description: 'Hours of sleep' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  sleepHours?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Liters of water intake' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  waterIntake?: number;

  @ApiPropertyOptional({ example: 8500, description: 'Daily step count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  steps?: number;

  @ApiPropertyOptional({ example: 'Feeling strong this week!' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

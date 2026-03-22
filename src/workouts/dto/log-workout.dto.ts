import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogWorkoutDto {
  @ApiProperty({ example: 'Bench Press' })
  @IsString()
  exercise: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @ApiPropertyOptional({ example: 45, description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    example: 85.5,
    description: 'Form score 0-100 from pose analysis',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  formScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID of the active generated workout plan' })
  @IsOptional()
  @IsString()
  workoutPlanId?: string;

  @ApiPropertyOptional({ description: 'Week number within the plan' })
  @IsOptional()
  @IsInt()
  @Min(1)
  planWeek?: number;

  @ApiPropertyOptional({ description: 'Day identifier within the plan week (e.g. "1")' })
  @IsOptional()
  @IsString()
  planDay?: string;
}

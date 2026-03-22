import { IsEnum, IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FitnessGoal, DietPreference } from '@prisma/client';

export class GenerateMealPlanDto {
  @ApiProperty({ enum: FitnessGoal })
  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;

  @ApiPropertyOptional({ enum: DietPreference })
  @IsOptional()
  @IsEnum(DietPreference)
  dietPreference?: DietPreference;

  @ApiPropertyOptional({ example: 2000, description: 'Target daily calories' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(5000)
  targetCalories?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;
}

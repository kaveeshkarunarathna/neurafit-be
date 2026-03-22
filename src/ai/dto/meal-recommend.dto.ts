import { IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FitnessGoal, DietPreference } from '@prisma/client';

export class MealRecommendDto {
  @ApiProperty({ enum: FitnessGoal })
  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;

  @ApiPropertyOptional({ enum: DietPreference })
  @IsOptional()
  @IsEnum(DietPreference)
  dietPreference?: DietPreference;

  @ApiPropertyOptional({ example: 2000 })
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

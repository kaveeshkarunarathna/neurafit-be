import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FitnessGoal, ActivityLevel, Difficulty } from '@prisma/client';

export class GenerateWorkoutDto {
  @ApiProperty({ enum: FitnessGoal })
  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;

  @ApiProperty({ enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  activityLevel: ActivityLevel;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiPropertyOptional({ example: 4, description: 'Duration in weeks (1-52)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks?: number;

  @ApiPropertyOptional({ example: 'Beginner with gym access' })
  @IsOptional()
  @IsString()
  notes?: string;
}

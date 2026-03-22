import { IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FitnessGoal, ActivityLevel, Difficulty } from '@prisma/client';

export class WorkoutRecommendDto {
  @ApiProperty({ enum: FitnessGoal })
  @IsEnum(FitnessGoal)
  fitnessGoal: FitnessGoal;

  @ApiProperty({ enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  activityLevel: ActivityLevel;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(100)
  age?: number;

  @ApiPropertyOptional({ example: 'No injuries' })
  @IsOptional()
  @IsString()
  healthNotes?: string;
}

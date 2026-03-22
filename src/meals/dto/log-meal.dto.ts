import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogMealDto {
  @ApiProperty({ example: 'Grilled Chicken Salad' })
  @IsString()
  foodName: string;

  @ApiProperty({ example: 350 })
  @IsInt()
  @Min(0)
  calories: number;

  @ApiProperty({ example: 30.5 })
  @IsNumber()
  @Min(0)
  protein: number;

  @ApiProperty({ example: 15.2 })
  @IsNumber()
  @Min(0)
  carbs: number;

  @ApiProperty({ example: 12.3 })
  @IsNumber()
  @Min(0)
  fat: number;

  @ApiPropertyOptional({ example: 'https://storage.example.com/meal.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}

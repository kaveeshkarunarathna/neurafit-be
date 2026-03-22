import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PoseAnalyzeDto {
  @ApiProperty({
    example: 'squat',
    description: 'Type of exercise being analyzed',
  })
  @IsString()
  @IsNotEmpty()
  exerciseType: string;

  @ApiProperty({ description: 'Base64 encoded video frame or image data' })
  @IsString()
  @IsNotEmpty()
  videoFrameData: string;

  @ApiPropertyOptional({ description: 'Additional context for analysis' })
  @IsOptional()
  @IsString()
  notes?: string;
}

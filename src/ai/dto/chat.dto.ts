import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatDto {
  @ApiProperty({
    description: 'The message sent by the user to the AI',
    example: 'What should I eat before a heavy lifting session?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}

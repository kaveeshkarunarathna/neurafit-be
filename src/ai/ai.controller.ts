import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { PoseAnalyzeDto } from './dto/pose-analyze.dto';
import { WorkoutRecommendDto } from './dto/workout-recommend.dto';
import { MealRecommendDto } from './dto/meal-recommend.dto';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('AI Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a message to the AI Fitness Chatbot' })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  chat(@CurrentUser('id') userId: string, @Body() dto: ChatDto) {
    return this.aiService.chat(userId, dto);
  }

  @Get('chat/history')
  @ApiOperation({ summary: 'Get chat history for the current user' })
  @ApiResponse({ status: 200, description: 'Chat history retrieved successfully.' })
  getChatHistory(@CurrentUser('id') userId: string) {
    return this.aiService.getChatHistory(userId);
  }

  @Post('workout/recommend')
  @ApiOperation({ summary: 'Get AI-powered workout recommendation' })
  @ApiResponse({ status: 201, description: 'Workout recommendation generated.' })
  recommendWorkout(
    @CurrentUser('id') userId: string,
    @Body() dto: WorkoutRecommendDto,
  ) {
    return this.aiService.recommendWorkout(userId, dto);
  }

  @Post('meal/recommend')
  @ApiOperation({ summary: 'Get AI-powered meal recommendation' })
  @ApiResponse({ status: 201, description: 'Meal recommendation generated.' })
  recommendMeal(
    @CurrentUser('id') userId: string,
    @Body() dto: MealRecommendDto,
  ) {
    return this.aiService.recommendMeal(userId, dto);
  }

  @Post('pose/analyze')
  @ApiOperation({ summary: 'Analyze exercise form from video frame data' })
  @ApiResponse({ status: 201, description: 'Pose analyzed successfully.' })
  analyzePose(@CurrentUser('id') userId: string, @Body() dto: PoseAnalyzeDto) {
    return this.aiService.analyzePose(userId, dto);
  }

  @Post('food/analyze')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Analyze food image for nutrition estimation' })
  @ApiResponse({ status: 201, description: 'Food analyzed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid image provided.' })
  analyzeFood(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|heic|heif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: { mealName?: string; ingredients?: string; servingSize?: string },
  ) {
    const hints =
      body.mealName || body.ingredients || body.servingSize
        ? { mealName: body.mealName, ingredients: body.ingredients, servingSize: body.servingSize }
        : undefined;
    return this.aiService.analyzeFood(userId, file.buffer, file.mimetype, hints);
  }
}

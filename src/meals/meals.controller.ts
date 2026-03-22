import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  Patch,
  Delete,
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
import { MealsService } from './meals.service';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { LogMealDto } from './dto/log-meal.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate an AI-powered meal plan based on fitness goal and diet',
  })
  generate(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateMealPlanDto,
  ) {
    return this.mealsService.generateMealPlan(userId, dto);
  }

  @Post('log')
  @ApiOperation({ summary: 'Log a meal with nutrition information' })
  logMeal(@CurrentUser('id') userId: string, @Body() dto: LogMealDto) {
    return this.mealsService.logMeal(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get meal log history' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.mealsService.getMealHistory(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get saved meal plans' })
  getPlans(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.mealsService.getMealPlans(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post('scan')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        mealName: { type: 'string', description: 'Optional meal name hint' },
        ingredients: {
          type: 'string',
          description: 'Optional comma-separated ingredients hint',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Scan a meal image for nutrition estimation (AI-powered)',
  })
  scanMeal(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
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
    return this.mealsService.scanMeal(userId, file.buffer, file.mimetype, hints);
  }

  @Patch('log/:id')
  @ApiOperation({ summary: 'Update a meal log' })
  @ApiResponse({ status: 200, description: 'Meal log updated successfully.' })
  @ApiResponse({ status: 404, description: 'Meal log not found.' })
  updateMealLog(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealLogDto,
  ) {
    return this.mealsService.updateMealLog(userId, id, dto);
  }

  @Delete('log/:id')
  @ApiOperation({ summary: 'Delete a meal log' })
  @ApiResponse({ status: 200, description: 'Meal log deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Meal log not found.' })
  deleteMealLog(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.mealsService.deleteMealLog(userId, id);
  }

  @Delete('plan/:id')
  @ApiOperation({ summary: 'Delete a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Meal plan not found.' })
  deleteMealPlan(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.mealsService.deleteMealPlan(userId, id);
  }
}

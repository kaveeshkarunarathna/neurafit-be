import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { GenerateWorkoutDto } from './dto/generate-workout.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate an AI-powered workout plan' })
  generate(@CurrentUser('id') userId: string, @Body() dto: GenerateWorkoutDto) {
    return this.workoutsService.generate(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get workout session history' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.workoutsService.getHistory(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post('log')
  @ApiOperation({ summary: 'Log a workout session' })
  logSession(@CurrentUser('id') userId: string, @Body() dto: LogWorkoutDto) {
    return this.workoutsService.logSession(userId, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get workout plans for a user' })
  findByUser(
    @Param('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.workoutsService.findByUser(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Patch('log/:id')
  @ApiOperation({ summary: 'Update a workout session' })
  @ApiResponse({ status: 200, description: 'Workout session updated successfully.' })
  @ApiResponse({ status: 404, description: 'Workout session not found.' })
  updateSession(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutSessionDto,
  ) {
    return this.workoutsService.updateSession(userId, id, dto);
  }

  @Delete('log/:id')
  @ApiOperation({ summary: 'Delete a workout session' })
  @ApiResponse({ status: 200, description: 'Workout session deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Workout session not found.' })
  deleteSession(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.workoutsService.deleteSession(userId, id);
  }

  @Delete('plan/:id')
  @ApiOperation({ summary: 'Delete a workout plan' })
  @ApiResponse({ status: 200, description: 'Workout plan deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Workout plan not found.' })
  deletePlan(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.workoutsService.deletePlan(userId, id);
  }
}

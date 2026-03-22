import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('user-summary')
  @ApiOperation({ summary: 'Get comprehensive user summary and stats' })
  getUserSummary(@CurrentUser('id') userId: string) {
    return this.analyticsService.getUserSummary(userId);
  }

  @Get('workout-stats')
  @ApiOperation({ summary: 'Get detailed workout statistics and trends' })
  getWorkoutStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getWorkoutStats(userId);
  }

  @Get('nutrition-stats')
  @ApiOperation({ summary: 'Get nutrition statistics and macro trends' })
  getNutritionStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getNutritionStats(userId);
  }
}

import { Controller, Post, Get, Body, Query, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { LogProgressDto } from './dto/log-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('log')
  @ApiOperation({
    summary: 'Log a progress entry (weight, body fat, muscle mass)',
  })
  logProgress(@CurrentUser('id') userId: string, @Body() dto: LogProgressDto) {
    return this.progressService.logProgress(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get progress history' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.progressService.getHistory(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive progress analytics with trends' })
  getAnalytics(
    @CurrentUser('id') userId: string,
    @Query('timeframe') timeframe?: string,
  ) {
    return this.progressService.getAnalytics(userId, timeframe);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a progress entry' })
  @ApiResponse({ status: 200, description: 'Progress entry updated successfully.' })
  @ApiResponse({ status: 404, description: 'Progress entry not found.' })
  updateProgress(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progressService.updateProgress(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a progress entry' })
  @ApiResponse({ status: 200, description: 'Progress entry deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Progress entry not found.' })
  deleteProgress(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.progressService.deleteProgress(userId, id);
  }
}

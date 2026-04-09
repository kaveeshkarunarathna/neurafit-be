/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LogProgressDto } from './dto/log-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async logProgress(userId: string, dto: LogProgressDto) {
    const log = await this.prisma.progressLog.create({
      data: {
        userId,
        weight: dto.weight,
        bodyFat: dto.bodyFat,
        muscleMass: dto.muscleMass,
        sleepHours: dto.sleepHours,
        waterIntake: dto.waterIntake,
        steps: dto.steps,
        notes: dto.notes,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    return { data: log, message: 'Progress logged successfully' };
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.progressLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.progressLog.count({ where: { userId } }),
    ]);

    return paginate(logs, total, page, limit);
  }

  async getAnalytics(userId: string, timeframe: string = 'weekly') {
    const [user, progressLogs, workoutSessions, mealLogs, activePlan] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { targetWeight: true, weight: true },
        }),
        this.prisma.progressLog.findMany({
          where: { userId },
          orderBy: { date: 'asc' },
        }),
        this.prisma.workoutSession.findMany({
          where: { userId },
          orderBy: { date: 'asc' },
        }),
        this.prisma.mealLog.findMany({
          where: { userId },
          orderBy: { date: 'asc' },
        }),
        this.prisma.workoutPlan.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    // Weight trend
    const weightTrend = progressLogs
      .filter((l) => l.weight != null)
      .map((l) => ({ date: l.date, weight: l.weight }));

    const latestWeight = weightTrend[weightTrend.length - 1]?.weight;
    const earliestWeight = weightTrend[0]?.weight;
    const weightChange =
      latestWeight && earliestWeight ? latestWeight - earliestWeight : null;

    // Determine Threshold limit based on `timeframe`
    let daysToCalculate = 7; // default weekly
    if (timeframe === 'daily') daysToCalculate = 1;
    if (timeframe === 'monthly') daysToCalculate = 30;
    if (timeframe === 'annual') daysToCalculate = 365;

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysToCalculate);

    // Workout frequency (sessions per threshold metric over defined timeframe)
    const recentSessions = workoutSessions.filter(
      (s) => s.date >= thresholdDate,
    );
    const workoutFrequencyMultiplier =
      timeframe === 'annual'
        ? 52.14
        : timeframe === 'monthly'
          ? 4.33
          : timeframe === 'daily'
            ? 1 / 7
            : 1;
    const workoutFrequency = parseFloat(
      (recentSessions.length / workoutFrequencyMultiplier).toFixed(1),
    );

    // Streak Calculation
    const uniqueWorkoutDates = [
      ...new Set(
        workoutSessions.map((s) => s.date.toISOString().split('T')[0]),
      ),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    let expectedDate = todayStr;
    if (uniqueWorkoutDates.length > 0 && uniqueWorkoutDates[0] === todayStr) {
      for (const date of uniqueWorkoutDates) {
        if (date === expectedDate) {
          currentStreak++;
          const d = new Date(date);
          d.setDate(d.getDate() - 1);
          expectedDate = d.toISOString().split('T')[0];
        } else {
          break;
        }
      }
    } else if (
      uniqueWorkoutDates.length > 0 &&
      uniqueWorkoutDates[0] === yesterdayStr
    ) {
      expectedDate = yesterdayStr;
      for (const date of uniqueWorkoutDates) {
        if (date === expectedDate) {
          currentStreak++;
          const d = new Date(date);
          d.setDate(d.getDate() - 1);
          expectedDate = d.toISOString().split('T')[0];
        } else {
          break;
        }
      }
    }

    // Active Plan Progress
    let activePlanProgress: any = null;
    if (activePlan) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const totalPlanDays = (activePlan.workouts as any[]).reduce(
        (total: number, w: any) => total + (w.days?.length || 0),
        0,
      );
      const planSessions = workoutSessions.filter(
        (s) => s.workoutPlanId === activePlan.id && s.planDay,
      );
      const uniqueDaysCompleted = new Set(
        planSessions.map((s) => `${s.planWeek}-${s.planDay}`),
      ).size;

      activePlanProgress = {
        planId: activePlan.id,
        goal: activePlan.goal,
        completedDays: uniqueDaysCompleted,
        totalDays: totalPlanDays,
        percentage:
          totalPlanDays > 0
            ? Math.round((uniqueDaysCompleted / totalPlanDays) * 100)
            : 0,
      };
    }

    // Average form score
    const sessionsWithScore = workoutSessions.filter(
      (s) => s.formScore != null && s.date >= thresholdDate,
    );
    const avgFormScore = sessionsWithScore.length
      ? parseFloat(
          (
            sessionsWithScore.reduce((sum, s) => sum + (s.formScore || 0), 0) /
            sessionsWithScore.length
          ).toFixed(1),
        )
      : null;

    // Calorie intake trend
    const recentMeals = mealLogs.filter((m) => m.date >= thresholdDate);
    const avgDailyCalories = recentMeals.length
      ? Math.round(
          recentMeals.reduce((sum, m) => sum + m.calories, 0) /
            (timeframe === 'daily' ? 1 : daysToCalculate),
        )
      : 0;

    // Health averages
    const recentProgress = progressLogs.filter((p) => p.date >= thresholdDate);

    const sleepLogs = recentProgress.filter((p) => p.sleepHours != null);
    const avgSleep = sleepLogs.length
      ? parseFloat(
          (
            sleepLogs.reduce((sum, p) => sum + (p.sleepHours || 0), 0) /
            sleepLogs.length
          ).toFixed(1),
        )
      : 0;

    const waterLogs = recentProgress.filter((p) => p.waterIntake != null);
    const avgWater = waterLogs.length
      ? parseFloat(
          (
            waterLogs.reduce((sum, p) => sum + (p.waterIntake || 0), 0) /
            waterLogs.length
          ).toFixed(1),
        )
      : 0;

    const stepLogs = recentProgress.filter((p) => p.steps != null);
    const avgSteps = stepLogs.length
      ? Math.round(
          stepLogs.reduce((sum, p) => sum + (p.steps || 0), 0) /
            stepLogs.length,
        )
      : 0;

    // Universal Activity Array Mapping (Limits generic history pull to latest 365 Days for Frontend UI handling without rigid blank blocks)
    // eslint-disable-next-line prefer-const
    let calendarDatesWithActivity = new Set<string>();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    [...workoutSessions, ...mealLogs, ...progressLogs].forEach((record) => {
      if (record.date >= oneYearAgo) {
        calendarDatesWithActivity.add(record.date.toISOString().split('T')[0]);
      }
    });

    const calendar = Array.from(calendarDatesWithActivity).map((dateStr) => ({
      date: dateStr,
      hasWorkout: workoutSessions.some(
        (s) => s.date.toISOString().split('T')[0] === dateStr,
      ),
      hasMeal: mealLogs.some(
        (m) => m.date.toISOString().split('T')[0] === dateStr,
      ),
      hasProgress: progressLogs.some(
        (p) => p.date.toISOString().split('T')[0] === dateStr,
      ),
    }));

    return {
      data: {
        userId,
        targetWeight: user?.targetWeight || null,
        startingWeight: earliestWeight || user?.weight || null,
        currentWeight: latestWeight || user?.weight || null,
        weightTrend,
        weightChange: weightChange
          ? { value: parseFloat(weightChange.toFixed(2)), unit: 'kg' }
          : null,
        streak: currentStreak,
        activePlanProgress,
        healthMetrics: {
          avgSleep,
          avgWater,
          avgSteps,
        },
        workoutFrequency: {
          sessionsPerWeek: workoutFrequency,
          sessionsInTimeframe: recentSessions.length,
          timeframe,
        },
        formScore: {
          average: avgFormScore,
          totalAnalyzed: sessionsWithScore.length,
        },
        nutrition: {
          avgDailyCalories,
          totalMealsLogged: mealLogs.length,
          recentMealsLogged: recentMeals.length,
        },
        activityCalendar: calendar,
      },
      message: 'Progress analytics retrieved',
    };
  }

  async updateProgress(userId: string, id: string, dto: UpdateProgressDto) {
    const log = await this.prisma.progressLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Progress log not found');
    if (log.userId !== userId)
      throw new ForbiddenException('Not authorized to access this resource');

    const updated = await this.prisma.progressLog.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
    });
    return { data: updated, message: 'Progress updated successfully' };
  }

  async deleteProgress(userId: string, id: string) {
    const log = await this.prisma.progressLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Progress log not found');
    if (log.userId !== userId)
      throw new ForbiddenException('Not authorized to access this resource');

    await this.prisma.progressLog.delete({ where: { id } });
    return { message: 'Progress deleted successfully' };
  }
}

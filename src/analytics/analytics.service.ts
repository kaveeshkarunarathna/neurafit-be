import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getUserSummary(userId: string) {
    const [
      user,
      workoutCount,
      mealCount,
      progressCount,
      workoutPlans,
      mealPlans,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          fitnessGoal: true,
          activityLevel: true,
          createdAt: true,
        },
      }),
      this.prisma.workoutSession.count({ where: { userId } }),
      this.prisma.mealLog.count({ where: { userId } }),
      this.prisma.progressLog.count({ where: { userId } }),
      this.prisma.workoutPlan.count({ where: { userId } }),
      this.prisma.mealPlan.count({ where: { userId } }),
    ]);

    const latestProgress = await this.prisma.progressLog.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const memberSince = user?.createdAt;
    const daysSinceMembership = memberSince
      ? Math.floor(
          (Date.now() - new Date(memberSince).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      data: {
        user,
        stats: {
          totalWorkoutSessions: workoutCount,
          totalMealsLogged: mealCount,
          totalProgressEntries: progressCount,
          workoutPlansGenerated: workoutPlans,
          mealPlansGenerated: mealPlans,
          daysSinceMembership,
        },
        latestBiometrics: latestProgress
          ? {
              weight: latestProgress.weight,
              bodyFat: latestProgress.bodyFat,
              muscleMass: latestProgress.muscleMass,
              date: latestProgress.date,
            }
          : null,
      },
      message: 'User summary retrieved',
    };
  }

  async getWorkoutStats(userId: string) {
    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const totalSessions = sessions.length;
    const sessionsWithScore = sessions.filter((s) => s.formScore != null);
    const avgFormScore = sessionsWithScore.length
      ? parseFloat(
          (
            sessionsWithScore.reduce((sum, s) => sum + (s.formScore ?? 0), 0) /
            sessionsWithScore.length
          ).toFixed(1),
        )
      : null;

    // Group sessions by exercise type
    const exerciseFrequency: Record<string, number> = {};
    sessions.forEach((s) => {
      exerciseFrequency[s.exercise] = (exerciseFrequency[s.exercise] || 0) + 1;
    });
    const topExercises = Object.entries(exerciseFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([exercise, count]) => ({ exercise, count }));

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter((s) => s.date >= thirtyDaysAgo);

    // Total duration
    const totalDuration = sessions
      .filter((s) => s.duration != null)
      .reduce((sum, s) => sum + (s.duration ?? 0), 0);

    return {
      data: {
        totalSessions,
        totalDurationMinutes: totalDuration,
        averageFormScore: avgFormScore,
        topExercises,
        last30Days: { sessions: recentSessions.length },
        streak: this.calculateStreak(sessions.map((s) => s.date)),
      },
      message: 'Workout statistics retrieved',
    };
  }

  async getNutritionStats(userId: string) {
    const mealLogs = await this.prisma.mealLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const totalMeals = mealLogs.length;
    const totalCalories = mealLogs.reduce((sum, m) => sum + m.calories, 0);
    const avgCalories = totalMeals ? Math.round(totalCalories / totalMeals) : 0;
    const totalProtein = parseFloat(
      mealLogs.reduce((sum, m) => sum + m.protein, 0).toFixed(1),
    );
    const totalCarbs = parseFloat(
      mealLogs.reduce((sum, m) => sum + m.carbs, 0).toFixed(1),
    );
    const totalFat = parseFloat(
      mealLogs.reduce((sum, m) => sum + m.fat, 0).toFixed(1),
    );

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMeals = mealLogs.filter((m) => m.date >= sevenDaysAgo);
    const avgDailyCalories = Math.round(
      recentMeals.reduce((sum, m) => sum + m.calories, 0) / 7,
    );

    // Top foods
    const foodFrequency: Record<string, number> = {};
    mealLogs.forEach((m) => {
      foodFrequency[m.foodName] = (foodFrequency[m.foodName] || 0) + 1;
    });
    const topFoods = Object.entries(foodFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));

    return {
      data: {
        totalMealsLogged: totalMeals,
        cumulativeNutrition: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        },
        averagePerMeal: { calories: avgCalories },
        last7Days: { meals: recentMeals.length, avgDailyCalories },
        topFoods,
      },
      message: 'Nutrition statistics retrieved',
    };
  }

  private calculateStreak(dates: Date[]): number {
    if (!dates.length) return 0;
    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const date of sortedDates) {
      const logDate = new Date(date);
      logDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }

    return streak;
  }
}

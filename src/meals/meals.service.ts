import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { LogMealDto } from './dto/log-meal.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async generateMealPlan(userId: string, dto: GenerateMealPlanDto) {
    // Call the real AI service for meal recommendation
    const aiResult = await this.aiService.recommendMeal(userId, {
      fitnessGoal: dto.fitnessGoal,
      dietPreference: dto.dietPreference,
      targetCalories: dto.targetCalories,
      allergies: dto.allergies,
    });

    const recommendation = aiResult.data.recommendation;
    const targetCalories = recommendation.dailyCalories || dto.targetCalories || 2000;

    // Map AI response into the format the FE expects
    const macros = recommendation.macroTargets || { protein: 0, carbs: 0, fat: 0 };
    const meals = Array.isArray(recommendation.meals)
      ? recommendation.meals.map((meal: any) => ({
          name: meal.name || 'Meal',
          calories: meal.totalCalories || 0,
          protein: meal.foods?.reduce((sum: number, f: any) => sum + (f.protein || 0), 0) || 0,
          carbs: meal.foods?.reduce((sum: number, f: any) => sum + (f.carbs || 0), 0) || 0,
          fat: meal.foods?.reduce((sum: number, f: any) => sum + (f.fat || 0), 0) || 0,
          time: meal.name || meal.time || 'Meal',
          foods: meal.foods || [],
        }))
      : [];

    const plan = await this.prisma.mealPlan.create({
      data: {
        userId,
        calories: targetCalories,
        macros,
        meals,
      },
    });

    return { data: plan, message: 'Meal plan generated successfully' };
  }

  async logMeal(userId: string, dto: LogMealDto) {
    const log = await this.prisma.mealLog.create({
      data: {
        userId,
        foodName: dto.foodName,
        calories: dto.calories,
        protein: dto.protein,
        carbs: dto.carbs,
        fat: dto.fat,
        imageUrl: dto.imageUrl,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    return { data: log, message: 'Meal logged successfully' };
  }

  async getMealHistory(userId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.mealLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.mealLog.count({ where: { userId } }),
    ]);

    return paginate(logs, total, page, limit);
  }

  async getMealPlans(userId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [plans, total] = await this.prisma.$transaction([
      this.prisma.mealPlan.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mealPlan.count({ where: { userId } }),
    ]);

    return paginate(plans, total, page, limit);
  }

  async scanMeal(
    userId: string,
    imageBuffer: Buffer,
    mimeType: string,
    hints?: { mealName?: string; ingredients?: string; servingSize?: string },
  ) {
    return this.aiService.analyzeFood(userId, imageBuffer, mimeType, hints);
  }

  async updateMealLog(userId: string, id: string, dto: UpdateMealLogDto) {
    const log = await this.prisma.mealLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Meal log not found');
    if (log.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    const updated = await this.prisma.mealLog.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
    });
    return { data: updated, message: 'Meal log updated successfully' };
  }

  async deleteMealLog(userId: string, id: string) {
    const log = await this.prisma.mealLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Meal log not found');
    if (log.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    await this.prisma.mealLog.delete({ where: { id } });
    return { message: 'Meal log deleted successfully' };
  }

  async deleteMealPlan(userId: string, id: string) {
    const plan = await this.prisma.mealPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Meal plan not found');
    if (plan.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    await this.prisma.mealPlan.delete({ where: { id } });
    return { message: 'Meal plan deleted successfully' };
  }
}

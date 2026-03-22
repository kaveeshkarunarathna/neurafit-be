import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { GenerateWorkoutDto } from './dto/generate-workout.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class WorkoutsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async generate(userId: string, dto: GenerateWorkoutDto) {
    // Call the real AI service for workout recommendation
    const aiResult = await this.aiService.recommendWorkout(userId, {
      fitnessGoal: dto.fitnessGoal,
      activityLevel: dto.activityLevel,
      difficulty: dto.difficulty,
      age: undefined,
      healthNotes: dto.notes,
    });

    const recommendation = aiResult.data.recommendation;
    const durationWeeks = dto.durationWeeks || 4;

    // Map AI response schedule into the week-based format the FE expects
    const weekSchedule = recommendation.schedule || [];
    const workouts = Array.from({ length: durationWeeks }, (_, weekIndex) => ({
      week: weekIndex + 1,
      days: weekSchedule.map((day: any) => ({
        day: day.day,
        focus: day.focus,
        exercises: Array.isArray(day.exercises)
          ? day.exercises.map((ex: any) =>
              typeof ex === 'string'
                ? ex
                : {
                    name: ex.name,
                    sets: ex.sets || 3,
                    reps: ex.reps || '10-12',
                    restPeriod: ex.rest || '60 seconds',
                  },
            )
          : [],
      })),
    }));

    const plan = await this.prisma.workoutPlan.create({
      data: {
        userId,
        goal: dto.fitnessGoal,
        difficulty: dto.difficulty,
        durationWeeks,
        workouts,
      },
    });

    return {
      data: plan,
      message: 'Workout plan generated successfully',
    };
  }

  async findByUser(userId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [plans, total] = await this.prisma.$transaction([
      this.prisma.workoutPlan.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workoutPlan.count({ where: { userId } }),
    ]);

    return paginate(plans, total, page, limit);
  }

  async logSession(userId: string, dto: LogWorkoutDto) {
    const session = await this.prisma.workoutSession.create({
      data: {
        userId,
        workoutPlanId: dto.workoutPlanId,
        planWeek: dto.planWeek,
        planDay: dto.planDay,
        exercise: dto.exercise,
        reps: dto.reps,
        sets: dto.sets,
        duration: dto.duration,
        formScore: dto.formScore,
        notes: dto.notes,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    return { data: session, message: 'Workout session logged' };
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const { skip, take } = getPaginationParams(page, limit);
    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.workoutSession.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.workoutSession.count({ where: { userId } }),
    ]);

    return paginate(sessions, total, page, limit);
  }

  async updateSession(userId: string, id: string, dto: UpdateWorkoutSessionDto) {
    const session = await this.prisma.workoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Workout session not found');
    if (session.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    const updated = await this.prisma.workoutSession.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
    });
    return { data: updated, message: 'Workout session updated successfully' };
  }

  async deleteSession(userId: string, id: string) {
    const session = await this.prisma.workoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Workout session not found');
    if (session.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    await this.prisma.workoutSession.delete({ where: { id } });
    return { message: 'Workout session deleted successfully' };
  }

  async deletePlan(userId: string, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Workout plan not found');
    if (plan.userId !== userId) throw new ForbiddenException('Not authorized to access this resource');

    await this.prisma.workoutPlan.delete({ where: { id } });
    return { message: 'Workout plan deleted successfully' };
  }
}

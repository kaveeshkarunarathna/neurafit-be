import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutsService } from './workouts.service';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';

const FitnessGoal = {
  GAIN_MUSCLE: 'GAIN_MUSCLE',
  LOSE_WEIGHT: 'LOSE_WEIGHT',
} as const;
const ActivityLevel = { MODERATELY_ACTIVE: 'MODERATELY_ACTIVE' } as const;
const Difficulty = { INTERMEDIATE: 'INTERMEDIATE' } as const;

const mockPrismaService = {
  workoutPlan: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  workoutSession: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAiService = {
  recommendWorkout: jest.fn(),
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<WorkoutsService>(WorkoutsService);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a workout plan and save it', async () => {
      mockAiService.recommendWorkout.mockResolvedValue({
        data: {
          recommendation: {
            schedule: [
              {
                day: 'Monday',
                focus: 'Upper Body',
                exercises: [
                  { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
                ],
              },
            ],
          },
        },
      });
      const mockPlan = {
        id: 'plan-1',
        userId: 'user-1',
        goal: FitnessGoal.GAIN_MUSCLE,
        difficulty: Difficulty.INTERMEDIATE,
        durationWeeks: 4,
        workouts: [],
        createdAt: new Date(),
      };
      mockPrismaService.workoutPlan.create.mockResolvedValue(mockPlan);

      const dto = {
        fitnessGoal: FitnessGoal.GAIN_MUSCLE,
        activityLevel: ActivityLevel.MODERATELY_ACTIVE,
        difficulty: Difficulty.INTERMEDIATE,
        durationWeeks: 4,
      };

      const result = await service.generate('user-1', dto);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id', 'plan-1');
      expect(mockPrismaService.workoutPlan.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('logSession', () => {
    it('should log a workout session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        exercise: 'Bench Press',
        reps: 10,
        sets: 3,
        duration: 45,
        date: new Date(),
      };
      mockPrismaService.workoutSession.create.mockResolvedValue(mockSession);

      const result = await service.logSession('user-1', {
        exercise: 'Bench Press',
        reps: 10,
        sets: 3,
        duration: 45,
      });

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('exercise', 'Bench Press');
    });
  });

  describe('getHistory', () => {
    it('should return paginated workout history', async () => {
      mockPrismaService.$transaction.mockResolvedValue([
        [{ id: 'session-1', exercise: 'Squat', userId: 'user-1' }],
        1,
      ]);

      const result = await service.getHistory('user-1', 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total', 1);
    });
  });
});

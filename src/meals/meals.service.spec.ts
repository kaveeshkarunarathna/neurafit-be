import { Test, TestingModule } from '@nestjs/testing';
import { MealsService } from './meals.service';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';

const FitnessGoal = { GAIN_MUSCLE: 'GAIN_MUSCLE' } as const;
const DietPreference = { NONE: 'NONE' } as const;

const mockPrismaService = {
  mealPlan: {
    create: jest.fn(),
  },
  mealLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAiService = {
  analyzeFood: jest.fn(),
};

describe('MealsService', () => {
  let service: MealsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
    jest.clearAllMocks();
  });

  describe('generateMealPlan', () => {
    it('should generate and save a meal plan', async () => {
      const mockPlan = { id: 'plan-1', userId: 'user-1', calories: 2000 };
      mockPrismaService.mealPlan.create.mockResolvedValue(mockPlan);

      const result = await service.generateMealPlan('user-1', {
        fitnessGoal: FitnessGoal.GAIN_MUSCLE,
        dietPreference: DietPreference.NONE,
        targetCalories: 2000,
      });

      expect(result).toHaveProperty('data');
      expect(mockPrismaService.mealPlan.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('logMeal', () => {
    it('should log a meal entry', async () => {
      const mockLog = {
        id: 'log-1',
        userId: 'user-1',
        foodName: 'Salad',
        calories: 250,
      };
      mockPrismaService.mealLog.create.mockResolvedValue(mockLog);

      const result = await service.logMeal('user-1', {
        foodName: 'Salad',
        calories: 250,
        protein: 8,
        carbs: 20,
        fat: 8,
      });

      expect(result.data).toHaveProperty('foodName', 'Salad');
    });
  });

  describe('scanMeal', () => {
    it('should delegate to AiService.analyzeFood and return the result', async () => {
      const mockResult = {
        data: {
          userId: 'user-1',
          foodName: 'Grilled Chicken Salad',
          estimatedCalories: 350,
          protein: 30,
          carbs: 15,
          fat: 12,
          confidenceScore: 0.88,
          detectedIngredients: ['chicken', 'lettuce', 'tomato'],
        },
        message: 'Food analysis complete',
      };
      mockAiService.analyzeFood.mockResolvedValue(mockResult);

      const imageBuffer = Buffer.from('fake-image-data');
      const result = await service.scanMeal('user-1', imageBuffer, 'image/jpeg', undefined);

      expect(result).toEqual(mockResult);
      expect(mockAiService.analyzeFood).toHaveBeenCalledWith(
        'user-1',
        imageBuffer,
        'image/jpeg',
        undefined,
      );
    });
  });
});

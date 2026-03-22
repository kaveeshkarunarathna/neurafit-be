import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

const FitnessGoal = { GAIN_MUSCLE: 'GAIN_MUSCLE' } as const;
const ActivityLevel = { MODERATELY_ACTIVE: 'MODERATELY_ACTIVE' } as const;
const Difficulty = { INTERMEDIATE: 'INTERMEDIATE' } as const;

const mockHttpService = { post: jest.fn() };
const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:8000'),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('analyzePose', () => {
    it('should return a pose analysis result', async () => {
      const result = await service.analyzePose('user-1', {
        exerciseType: 'squat',
        videoFrameData: 'base64data',
      });

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('formScore');
      expect(result.data).toHaveProperty('feedback');
      expect(result.data).toHaveProperty('detectedMistakes');
    });

    it('should handle unknown exercise types with default response', async () => {
      const result = await service.analyzePose('user-1', {
        exerciseType: 'unknownExercise',
        videoFrameData: 'base64data',
      });

      expect(result.data).toHaveProperty('formScore');
    });
  });

  describe('recommendWorkout', () => {
    it('should return a workout recommendation', async () => {
      const result = await service.recommendWorkout('user-1', {
        fitnessGoal: FitnessGoal.GAIN_MUSCLE,
        activityLevel: ActivityLevel.MODERATELY_ACTIVE,
        difficulty: Difficulty.INTERMEDIATE,
      });

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('recommendation');
    });
  });

  describe('analyzeFood', () => {
    it('should return food analysis with nutrition info', async () => {
      const result = await service.analyzeFood('user-1');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('estimatedCalories');
      expect(result.data).toHaveProperty('confidenceScore');
    });
  });
});

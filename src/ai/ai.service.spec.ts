import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RagService } from '../rag/rag.service';
import { InternalServerErrorException } from '@nestjs/common';

const FitnessGoal = { GAIN_MUSCLE: 'GAIN_MUSCLE' } as const;
const ActivityLevel = { MODERATELY_ACTIVE: 'MODERATELY_ACTIVE' } as const;
const Difficulty = { INTERMEDIATE: 'INTERMEDIATE' } as const;

const mockHttpService = { post: jest.fn() };
const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'ai.serviceUrl') return 'http://localhost:8000';
    return undefined;
  }),
};
const mockPrismaService = {
  user: { findUnique: jest.fn() },
  chatMessage: { create: jest.fn(), findMany: jest.fn() },
};
const mockRagService = { getContext: jest.fn().mockResolvedValue('') };

const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  age: 25,
  height: 180,
  weight: 80,
  targetWeight: 75,
  fitnessGoal: 'GAIN_MUSCLE',
  dietPreference: 'NONE',
  activityLevel: 'MODERATELY_ACTIVE',
  medicalConditions: null,
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  describe('ensureConfigured', () => {
    it('should throw InternalServerErrorException if GEMINI_API_KEY is not set', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // The service was initialized with mock config returning 'http://localhost:8000'
      // which is not a valid Gemini key, so genai is not configured
      await expect(
        service.chat('user-1', { message: 'Hello' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history for a user', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          userId: 'user-1',
          role: 'ai',
          content: 'Hi! How can I help?',
          createdAt: new Date(),
        },
      ];
      mockPrismaService.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getChatHistory('user-1');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('role', 'user');
      expect(result.data[1]).toHaveProperty('role', 'ai');
      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array for new user with no history', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getChatHistory('new-user');

      expect(result.data).toEqual([]);
    });
  });

  describe('recommendWorkout', () => {
    it('should throw when AI is not configured', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.recommendWorkout('user-1', {
          fitnessGoal: FitnessGoal.GAIN_MUSCLE,
          activityLevel: ActivityLevel.MODERATELY_ACTIVE,
          difficulty: Difficulty.INTERMEDIATE,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('analyzeFood', () => {
    it('should throw when AI is not configured', async () => {
      await expect(
        service.analyzeFood('user-1', Buffer.from('mock-image'), 'image/jpeg'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});

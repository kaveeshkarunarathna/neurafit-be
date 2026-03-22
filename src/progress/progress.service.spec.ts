import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../database/prisma.service';

const mockPrismaService = {
  progressLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  workoutSession: { findMany: jest.fn() },
  mealLog: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    jest.clearAllMocks();
  });

  describe('logProgress', () => {
    it('should log a progress entry', async () => {
      const mockLog = {
        id: 'log-1',
        userId: 'user-1',
        weight: 72.5,
        date: new Date(),
      };
      mockPrismaService.progressLog.create.mockResolvedValue(mockLog);

      const result = await service.logProgress('user-1', { weight: 72.5 });

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('weight', 72.5);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics with empty data gracefully', async () => {
      mockPrismaService.progressLog.findMany.mockResolvedValue([]);
      mockPrismaService.workoutSession.findMany.mockResolvedValue([]);
      mockPrismaService.mealLog.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics('user-1');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('weightTrend');
      expect(result.data).toHaveProperty('workoutFrequency');
      expect(result.data).toHaveProperty('nutrition');
    });
  });
});

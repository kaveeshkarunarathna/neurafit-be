import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user by ID', async () => {
      const mockUser = { id: 'user-1', name: 'John', email: 'john@test.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update own profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
      });

      const result = await service.update('user-1', 'user-1', {
        name: 'Updated Name',
      });
      expect(result).toHaveProperty('name', 'Updated Name');
    });

    it('should throw ForbiddenException when updating another user', async () => {
      await expect(
        service.update('user-1', 'user-2', { name: 'Hacker' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete own account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.user.delete.mockResolvedValue({});

      const result = await service.remove('user-1', 'user-1');
      expect(result).toHaveProperty('message');
    });

    it('should throw ForbiddenException when deleting another user', async () => {
      await expect(service.remove('user-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'John Doe',
        email: 'john@test.com',
        createdAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.register({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'john@test.com',
      });

      await expect(
        service.register({
          name: 'John',
          email: 'john@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'john@test.com',
        password: hashedPassword,
        name: 'John Doe',
        refreshToken: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'john@test.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException with wrong credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword!', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'john@test.com',
        password: hashedPassword,
      });

      await expect(
        service.login({ email: 'john@test.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        name: 'John Doe',
        email: 'john@test.com',
        createdAt: new Date(),
      });

      const result = await service.getProfile('user-id-1');
      expect(result).toHaveProperty('id', 'user-id-1');
      expect(result).toHaveProperty('email', 'john@test.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

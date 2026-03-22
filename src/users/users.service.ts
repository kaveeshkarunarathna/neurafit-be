import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  age: true,
  height: true,
  weight: true,
  targetWeight: true,
  fitnessGoal: true,
  dietPreference: true,
  activityLevel: true,
  medicalConditions: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findProfile(userId: string) {
    return this.findById(userId);
  }

  async update(id: string, requesterId: string, dto: UpdateUserDto) {
    if (id !== requesterId)
      throw new ForbiddenException('Cannot update another user');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async remove(id: string, requesterId: string) {
    if (id !== requesterId)
      throw new ForbiddenException('Cannot delete another user');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async findAll(page: number, limit: number) {
    const { skip, take } = getPaginationParams(page, limit);
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return paginate(users, total, page, limit);
  }
}

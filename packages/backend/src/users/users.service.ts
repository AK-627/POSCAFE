import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from './user.entity';
import { User, UserRole } from '@skynether/shared/types/user';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  branchId?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByTenant(tenantId: string): Promise<UserEntity[]> {
    return this.usersRepository.find({ where: { tenantId } });
  }

  async createUser(input: CreateUserInput): Promise<UserEntity> {
    const passwordHash = await argon2.hash(input.password);
    const user = this.usersRepository.create({
      id: uuidv4(),
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      tenantId: input.tenantId,
      branchId: input.branchId,
      isActive: true,
    });
    return this.usersRepository.save(user);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLoginAt: new Date() });
  }

  async ensureDefaultUsers(): Promise<void> {
    const defaultTenantId = uuidv4();
    const defaultUsers: Array<Omit<CreateUserInput, 'tenantId'>> = [
      {
        email: 'owner@cafe.com',
        password: 'password123',
        firstName: 'Alex',
        lastName: 'Johnson',
        role: UserRole.OWNER,
      },
      {
        email: 'manager@cafe.com',
        password: 'password123',
        firstName: 'Sarah',
        lastName: 'Miller',
        role: UserRole.MANAGER,
      },
      {
        email: 'cashier@cafe.com',
        password: 'password123',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: UserRole.CASHIER,
      },
      {
        email: 'waiter@cafe.com',
        password: 'password123',
        firstName: 'Emma',
        lastName: 'Davis',
        role: UserRole.WAITER,
      },
      {
        email: 'chef@cafe.com',
        password: 'password123',
        firstName: 'David',
        lastName: 'Brown',
        role: UserRole.CHEF,
      },
    ];

    for (const defaultUser of defaultUsers) {
      const existing = await this.findByEmail(defaultUser.email);
      if (!existing) {
        this.logger.log(`Seeding default user: ${defaultUser.email}`);
        await this.createUser({
          ...defaultUser,
          tenantId: defaultTenantId,
        });
      }
    }
  }

  toDto(user: UserEntity): User {
    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
      createdAt: new Date(user.createdAt),
    } as User;
  }
}

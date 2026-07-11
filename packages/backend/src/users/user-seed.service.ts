import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class UserSeedService implements OnModuleInit {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    try {
      this.logger.log('Ensuring default users exist');
      await this.usersService.ensureDefaultUsers();
    } catch (error) {
      this.logger.error('Failed to seed default users', error);
    }
  }
}

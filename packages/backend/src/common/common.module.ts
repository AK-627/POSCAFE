import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@Global()
@Module({
  providers: [CacheService, DeadLetterQueueService],
  exports: [CacheService, DeadLetterQueueService],
})
export class CommonModule {}

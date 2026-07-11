import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class DatabaseModule {}

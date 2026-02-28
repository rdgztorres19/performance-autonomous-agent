import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { ConnectionsModule } from './connections/connections.module.js';

@Module({
  imports: [DatabaseModule, ConnectionsModule],
})
export class AppModule {}

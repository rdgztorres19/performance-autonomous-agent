import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ConfigurationService } from './configuration.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigModule {}

import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module.js';
import { ConfigModule } from '../config/config.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ConfigurationController } from './controllers/configuration.controller.js';
import { SessionController } from './controllers/session.controller.js';

@Module({
  imports: [AgentModule, ConfigModule, DatabaseModule],
  controllers: [ConfigurationController, SessionController],
})
export class ApiModule {}

import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module.js';
import { ConfigModule } from '../config/config.module.js';
import { ConfigurationController } from './controllers/configuration.controller.js';
import { SessionController } from './controllers/session.controller.js';

@Module({
  imports: [AgentModule, ConfigModule],
  controllers: [ConfigurationController, SessionController],
})
export class ApiModule {}

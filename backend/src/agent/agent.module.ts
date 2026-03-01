import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { ToolsModule } from '../tools/tools.module.js';
import { AgentService } from './services/agent.service.js';
import { TimelineService } from './services/timeline.service.js';
import { ReportService } from './services/report.service.js';
import { FormGenerationService } from './services/form-generation.service.js';
import { UserInteractionService } from './services/user-interaction.service.js';

@Module({
  imports: [DatabaseModule, ConnectionsModule, ToolsModule],
  providers: [AgentService, TimelineService, ReportService, FormGenerationService, UserInteractionService],
  exports: [AgentService, TimelineService, ReportService, FormGenerationService, UserInteractionService],
})
export class AgentModule {}

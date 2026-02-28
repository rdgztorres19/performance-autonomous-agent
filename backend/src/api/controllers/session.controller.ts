import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AgentService } from '../../agent/services/agent.service.js';
import { TimelineService } from '../../agent/services/timeline.service.js';
import { ReportService } from '../../agent/services/report.service.js';
import { FormGenerationService } from '../../agent/services/form-generation.service.js';

@Controller('api/sessions')
export class SessionController {
  constructor(
    private readonly agentService: AgentService,
    private readonly timelineService: TimelineService,
    private readonly reportService: ReportService,
    private readonly formGenerationService: FormGenerationService,
  ) {}

  @Post()
  async create(@Body() body: { configurationId: string }) {
    return this.agentService.startSession(body.configurationId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.agentService.getSession(id);
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    await this.agentService.stopSession(id);
    return { success: true };
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.timelineService.getBySession(id);
  }

  @Get(':id/reports')
  async getReports(@Param('id') id: string) {
    return this.reportService.getBySession(id);
  }

  @Get(':id/forms')
  async getForms(@Param('id') id: string) {
    return this.formGenerationService.getBySession(id);
  }
}

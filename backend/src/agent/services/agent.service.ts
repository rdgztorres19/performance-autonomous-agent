import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';

import { Session, SessionStatus, Configuration } from '../../database/entities/index.js';
import { ToolRegistry } from '../../tools/tool-registry.js';
import { AgentToolRegistry } from '../../tools/agent/agent-tool-registry.js';
import type { AgentContext } from '../../tools/agent/base-agent-tool.js';
import { PERFORMANCE_TOOL_CLASSES_TOKEN } from '../../tools/tools.module.js';
import { ConnectionFactory } from '../../connections/connection.factory.js';
import { TimelineService } from './timeline.service.js';
import { ReportService } from './report.service.js';
import { FormGenerationService } from './form-generation.service.js';
import { UserInteractionService } from './user-interaction.service.js';
import { wrapAllToolsForLangChain } from './langchain-tool.wrapper.js';
import { SYSTEM_PROMPT } from '../prompts/system-prompt.js';
import type { Connection } from '../../common/interfaces/index.js';
import type { BaseTool } from '../../tools/base-tool.js';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
    private readonly toolRegistry: ToolRegistry,
    private readonly agentToolRegistry: AgentToolRegistry,
    @Inject(PERFORMANCE_TOOL_CLASSES_TOKEN)
    private readonly performanceToolClasses: (new (conn: Connection) => BaseTool)[],
    private readonly connectionFactory: ConnectionFactory,
    private readonly timelineService: TimelineService,
    private readonly reportService: ReportService,
    private readonly formGenerationService: FormGenerationService,
    private readonly userInteractionService: UserInteractionService,
  ) {}

  async startSession(configurationId: string): Promise<Session> {
    const config = await this.configRepo.findOneByOrFail({ id: configurationId });

    const session = this.sessionRepo.create({
      configurationId: config.id,
      status: SessionStatus.RUNNING,
    });
    const saved = await this.sessionRepo.save(session);

    await this.timelineService.logInfo(saved.id, 'Session started', {
      connectionType: config.connectionType,
    });

    this.runAgent(saved.id, config).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Agent session ${saved.id} failed: ${message}`, stack);
    });

    return saved;
  }

  private async runAgent(sessionId: string, config: Configuration): Promise<void> {
    const connection = this.connectionFactory.create({
      type: config.connectionType as 'local' | 'ssh',
      ssh: config.sshHost
        ? {
            host: config.sshHost,
            port: config.sshPort ?? 22,
            username: config.sshUsername ?? '',
            password: config.sshPassword,
            privateKey: config.sshPrivateKey,
          }
        : undefined,
    });

    try {
      await connection.connect();
      await this.timelineService.logInfo(sessionId, `Connected via ${config.connectionType}`);

      this.registerPerformanceTools(connection);

      if (!config.openaiApiKey) {
        throw new Error(
          'OpenAI API key is not configured. Update the configuration with a valid API key.',
        );
      }

      const llm = new ChatOpenAI({
        apiKey: config.openaiApiKey,
        model: config.openaiModel ?? 'gpt-4o',
        temperature: 0,
      });

      const agentContext: AgentContext = {
        sessionId,
        llm,
        timelineService: this.timelineService,
        reportService: this.reportService,
        formGenerationService: this.formGenerationService,
        userInteractionService: this.userInteractionService,
      };

      const toolWrapperCtx = { sessionId, timelineService: this.timelineService };
      const performanceLcTools = wrapAllToolsForLangChain(
        this.toolRegistry.getAll(),
        toolWrapperCtx,
      );
      const agentLcTools = this.agentToolRegistry.toLangChainTools(agentContext);
      const allTools = [...performanceLcTools, ...agentLcTools];

      const agent = createAgent({
        model: llm,
        tools: allTools,
        systemPrompt: SYSTEM_PROMPT,
      });

      await this.timelineService.logInfo(
        sessionId,
        `Agent initialized with ${allTools.length} tools`,
      );

      await agent.invoke(
        {
          messages: [
            {
              role: 'user',
              content:
                'Hello! I need your help diagnosing performance issues on this Linux system. Please start by asking me what problems I am experiencing, then proceed with your investigation.',
            },
          ],
        },
        { recursionLimit: 150 },
      );

      await this.timelineService.logInfo(sessionId, 'Agent scan completed');

      await this.sessionRepo.update(sessionId, {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.timelineService.logError(sessionId, `Agent failed: ${message}`);
      await this.sessionRepo.update(sessionId, {
        status: SessionStatus.FAILED,
        completedAt: new Date(),
      });
    } finally {
      await connection.disconnect();
    }
  }

  private registerPerformanceTools(connection: Connection): void {
    for (const ToolClass of this.performanceToolClasses) {
      this.toolRegistry.register(new ToolClass(connection));
    }
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
      relations: ['timelineEntries', 'problemReports'],
    });
  }

  async stopSession(sessionId: string): Promise<void> {
    this.userInteractionService.cancelSession(sessionId);
    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
    });
    await this.timelineService.logInfo(sessionId, 'Session stopped by user');
  }
}

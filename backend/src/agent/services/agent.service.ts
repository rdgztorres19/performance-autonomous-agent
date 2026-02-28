import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { Session, SessionStatus, Configuration } from '../../database/entities/index.js';
import { ProblemCategory, ProblemSeverity } from '../../database/entities/index.js';
import { ToolRegistry } from '../../tools/tool-registry.js';
import { ConnectionFactory } from '../../connections/connection.factory.js';
import { TimelineService } from './timeline.service.js';
import { ReportService } from './report.service.js';
import { FormGenerationService } from './form-generation.service.js';
import { wrapAllToolsForLangChain } from './langchain-tool.wrapper.js';
import { SYSTEM_PROMPT } from '../prompts/system-prompt.js';
import type { Connection } from '../../common/interfaces/index.js';
import { BaseTool } from '../../tools/base-tool.js';

import {
  CpuUtilizationTool,
  LoadAverageTool,
  CpuSaturationTool,
  CpuSchedulingTool,
} from '../../tools/system/cpu/index.js';
import { MemoryUtilizationTool, MemoryPressureTool } from '../../tools/system/memory/index.js';
import {
  DiskThroughputTool,
  DiskSaturationTool,
  FileSystemTool,
} from '../../tools/system/disk/index.js';
import {
  NetworkThroughputTool,
  NetworkErrorsTool,
  NetworkConnectionsTool,
} from '../../tools/system/network/index.js';
import { KernelMetricsTool } from '../../tools/system/kernel/index.js';
import { VirtualizationMetricsTool } from '../../tools/system/virtualization/index.js';
import {
  ProcessCpuTool,
  ProcessMemoryTool,
  ProcessIoTool,
} from '../../tools/application/process/index.js';
import { ThreadingMetricsTool } from '../../tools/application/threading/index.js';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
    private readonly toolRegistry: ToolRegistry,
    private readonly connectionFactory: ConnectionFactory,
    private readonly timelineService: TimelineService,
    private readonly reportService: ReportService,
    private readonly formGenerationService: FormGenerationService,
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

    this.runAgent(saved.id, config).catch((err) => {
      this.logger.error(`Agent session ${saved.id} failed: ${err.message}`, err.stack);
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

      this.registerTools(connection);

      const llm = new ChatOpenAI({
        openAIApiKey: config.openaiApiKey ?? '',
        modelName: config.openaiModel ?? 'gpt-4o',
        temperature: 0,
      });

      const langchainTools = wrapAllToolsForLangChain(this.toolRegistry.getAll());
      const agentTools = [...langchainTools, ...this.createAgentMetaTools(sessionId, llm)];

      const agent = createReactAgent({
        llm,
        tools: agentTools,
      });

      await this.timelineService.logInfo(
        sessionId,
        `Agent initialized with ${agentTools.length} tools`,
      );

      const result = await agent.invoke({
        messages: [
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(
            'Start a comprehensive performance scan of this Linux system. Begin with high-level system metrics, then drill down into any areas showing potential issues. Report any problems you find.',
          ),
        ],
      });

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

  private registerTools(connection: Connection): void {
    const toolClasses: (new (conn: Connection) => BaseTool)[] = [
      CpuUtilizationTool,
      LoadAverageTool,
      CpuSaturationTool,
      CpuSchedulingTool,
      MemoryUtilizationTool,
      MemoryPressureTool,
      DiskThroughputTool,
      DiskSaturationTool,
      FileSystemTool,
      NetworkThroughputTool,
      NetworkErrorsTool,
      NetworkConnectionsTool,
      KernelMetricsTool,
      VirtualizationMetricsTool,
      ProcessCpuTool,
      ProcessMemoryTool,
      ProcessIoTool,
      ThreadingMetricsTool,
    ];

    for (const ToolClass of toolClasses) {
      this.toolRegistry.register(new ToolClass(connection));
    }
  }

  private createAgentMetaTools(
    sessionId: string,
    llm: ChatOpenAI,
  ): DynamicStructuredTool[] {
    const reportTool = new DynamicStructuredTool({
      name: 'report_problem',
      description:
        'Report a detected performance problem. Use this when you identify a performance issue based on collected metrics.',
      schema: z.object({
        category: z
          .enum(['cpu', 'memory', 'disk', 'network', 'kernel', 'virtualization', 'application', 'file_system', 'other'])
          .describe('Problem category'),
        severity: z.enum(['critical', 'warning', 'info']).describe('Problem severity'),
        title: z.string().describe('Brief problem title'),
        description: z.string().describe('Problem description'),
        explanation: z.string().describe('Why this is a problem'),
        metrics: z.string().describe('JSON string of relevant metrics'),
        recommendations: z.string().describe('Comma-separated list of recommendations'),
      }),
      func: async (input) => {
        let metricsObj: Record<string, unknown> = {};
        try {
          metricsObj = JSON.parse(input.metrics);
        } catch {
          metricsObj = { raw: input.metrics };
        }

        const report = await this.reportService.createReport({
          sessionId,
          category: input.category as ProblemCategory,
          severity: input.severity as ProblemSeverity,
          title: input.title,
          description: input.description,
          explanation: input.explanation,
          metrics: metricsObj,
          recommendations: input.recommendations.split(',').map((r) => r.trim()),
        });

        await this.timelineService.logProblemDetected(sessionId, `[${input.severity.toUpperCase()}] ${input.title}`, {
          reportId: report.id,
          category: input.category,
          severity: input.severity,
        });

        return JSON.stringify({ success: true, reportId: report.id });
      },
    });

    const timelineTool = new DynamicStructuredTool({
      name: 'log_reasoning',
      description:
        'Log your current reasoning and decision to the timeline. Use this to explain what you are checking and why.',
      schema: z.object({
        description: z.string().describe('What you are about to do and why'),
        reasoning: z.string().describe('Your reasoning for this decision'),
      }),
      func: async (input) => {
        await this.timelineService.logAgentDecision(sessionId, input.description, input.reasoning);
        return JSON.stringify({ success: true });
      },
    });

    const requestInfoTool = new DynamicStructuredTool({
      name: 'request_user_info',
      description:
        'Request additional information from the user by generating a form. Use when you need specific context to continue debugging.',
      schema: z.object({
        context: z
          .string()
          .describe('Describe what information you need and why, so a form can be generated'),
      }),
      func: async (input) => {
        const form = await this.formGenerationService.generateForm(llm, sessionId, input.context);
        await this.timelineService.logUserInteraction(sessionId, `Requesting user input: ${input.context}`, {
          formId: form.id,
        });
        return JSON.stringify({
          success: true,
          formId: form.id,
          message: 'Form sent to user. Waiting for response.',
        });
      },
    });

    return [reportTool, timelineTool, requestInfoTool];
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
      relations: ['timelineEntries', 'problemReports'],
    });
  }

  async stopSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.COMPLETED,
      completedAt: new Date(),
    });
    await this.timelineService.logInfo(sessionId, 'Session stopped by user');
  }
}

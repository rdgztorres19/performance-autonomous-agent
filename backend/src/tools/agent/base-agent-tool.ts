import { DynamicStructuredTool } from '@langchain/core/tools';
import type { ChatOpenAI } from '@langchain/openai';
import type { z } from 'zod';
import type { TimelineService } from '../../agent/services/timeline.service.js';
import type { ReportService } from '../../agent/services/report.service.js';
import type { FormGenerationService } from '../../agent/services/form-generation.service.js';
import type { UserInteractionService } from '../../agent/services/user-interaction.service.js';

export interface AgentContext {
  sessionId: string;
  llm: ChatOpenAI;
  timelineService: TimelineService;
  reportService: ReportService;
  formGenerationService: FormGenerationService;
  userInteractionService: UserInteractionService;
}

export interface AgentToolMetadata {
  name: string;
  description: string;
}

export abstract class BaseAgentTool {
  abstract getMetadata(): AgentToolMetadata;

  protected abstract buildSchema(): z.ZodObject<z.ZodRawShape>;

  protected abstract execute(
    input: Record<string, unknown>,
    context: AgentContext,
  ): Promise<string>;

  toLangChainTool(context: AgentContext): DynamicStructuredTool {
    const metadata = this.getMetadata();

    return new DynamicStructuredTool({
      name: metadata.name,
      description: metadata.description,
      schema: this.buildSchema(),
      func: async (input: Record<string, unknown>) => {
        return this.execute(input, context);
      },
    });
  }
}

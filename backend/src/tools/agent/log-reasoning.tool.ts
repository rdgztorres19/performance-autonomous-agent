import { z } from 'zod';
import { BaseAgentTool } from './base-agent-tool.js';
import type { AgentContext, AgentToolMetadata } from './base-agent-tool.js';

export class LogReasoningTool extends BaseAgentTool {
  getMetadata(): AgentToolMetadata {
    return {
      name: 'log_reasoning',
      description:
        'Log your current reasoning and decision to the timeline. Use this to explain what you are checking and why.',
    };
  }

  protected buildSchema() {
    return z.object({
      description: z.string().describe('What you are about to do and why'),
      reasoning: z.string().describe('Your reasoning for this decision'),
    });
  }

  protected async execute(input: Record<string, unknown>, context: AgentContext): Promise<string> {
    await context.timelineService.logAgentDecision(
      context.sessionId,
      input['description'] as string,
      input['reasoning'] as string,
    );
    return JSON.stringify({ success: true });
  }
}

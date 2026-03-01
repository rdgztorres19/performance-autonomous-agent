import { z } from 'zod';
import { BaseAgentTool } from './base-agent-tool.js';
import type { AgentContext, AgentToolMetadata } from './base-agent-tool.js';

export class RequestUserInfoTool extends BaseAgentTool {
  getMetadata(): AgentToolMetadata {
    return {
      name: 'request_user_info',
      description:
        'Request additional information from the user by generating a dynamic form. The tool will wait for the user to respond before returning. Use when you need specific context to continue debugging.',
    };
  }

  protected buildSchema() {
    return z.object({
      context: z
        .string()
        .describe('Describe what information you need and why, so a form can be generated'),
    });
  }

  protected async execute(
    input: Record<string, unknown>,
    agentContext: AgentContext,
  ): Promise<string> {
    const requestContext = input['context'] as string;

    const form = await agentContext.formGenerationService.generateForm(
      agentContext.llm,
      agentContext.sessionId,
      requestContext,
    );

    await agentContext.timelineService.logUserInteraction(
      agentContext.sessionId,
      `Requesting user input: ${requestContext}`,
      { formId: form.id },
    );

    try {
      const userResponse = await agentContext.userInteractionService.waitForResponse(
        agentContext.sessionId,
        form.id,
      );

      await agentContext.timelineService.logUserInteraction(
        agentContext.sessionId,
        `User responded to form ${form.id}`,
        { formId: form.id, responseKeys: Object.keys(userResponse) },
      );

      return JSON.stringify({
        success: true,
        formId: form.id,
        userResponse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        success: false,
        formId: form.id,
        error: message,
        message: 'User did not respond in time. Continue with available information.',
      });
    }
  }
}

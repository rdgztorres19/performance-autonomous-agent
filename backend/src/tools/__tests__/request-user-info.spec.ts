import { RequestUserInfoTool } from '../agent/request-user-info.tool';
import type { AgentContext } from '../agent/base-agent-tool';

function createMockAgentContext(
  userResponse: Record<string, unknown> = { answer: 'yes' },
  shouldTimeout = false,
): AgentContext {
  return {
    sessionId: 'test-session-789',
    llm: {} as any,
    timelineService: {
      logAgentDecision: jest.fn().mockResolvedValue(undefined),
      logToolExecution: jest.fn().mockResolvedValue(undefined),
      logProblemDetected: jest.fn().mockResolvedValue(undefined),
      logUserInteraction: jest.fn().mockResolvedValue(undefined),
    } as any,
    reportService: {} as any,
    formGenerationService: {
      generateForm: jest.fn().mockResolvedValue({ id: 'form-001', fields: [] }),
    } as any,
    userInteractionService: {
      waitForResponse: shouldTimeout
        ? jest.fn().mockRejectedValue(new Error('Timeout waiting for user response'))
        : jest.fn().mockResolvedValue(userResponse),
    } as any,
  };
}

describe('RequestUserInfoTool', () => {
  let tool: RequestUserInfoTool;

  beforeEach(() => {
    tool = new RequestUserInfoTool();
  });

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = tool.getMetadata();
      expect(meta.name).toBe('request_user_info');
    });
  });

  describe('buildSchema', () => {
    it('should define context field', () => {
      const schema = (tool as any).buildSchema();
      expect(schema.shape.context).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should generate form and wait for user response', async () => {
      const ctx = createMockAgentContext({ problem: 'slow queries' });
      const result = await (tool as any).execute(
        { context: 'What database are you using?' },
        ctx,
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.formId).toBe('form-001');
      expect(parsed.userResponse).toEqual({ problem: 'slow queries' });

      expect(ctx.formGenerationService.generateForm).toHaveBeenCalledWith(
        ctx.llm,
        'test-session-789',
        'What database are you using?',
      );
      expect(ctx.timelineService.logUserInteraction).toHaveBeenCalledTimes(2);
    });

    it('should handle user timeout gracefully', async () => {
      const ctx = createMockAgentContext({}, true);
      const result = await (tool as any).execute(
        { context: 'Need more info' },
        ctx,
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.formId).toBe('form-001');
      expect(parsed.error).toContain('Timeout');
      expect(parsed.message).toContain('Continue with available information');
    });
  });
});

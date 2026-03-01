import { LogReasoningTool } from '../agent/log-reasoning.tool';
import type { AgentContext } from '../agent/base-agent-tool';

function createMockAgentContext(): AgentContext {
  return {
    sessionId: 'test-session-123',
    llm: {} as any,
    timelineService: {
      logAgentDecision: jest.fn().mockResolvedValue(undefined),
      logToolExecution: jest.fn().mockResolvedValue(undefined),
      logProblemDetected: jest.fn().mockResolvedValue(undefined),
      logUserInteraction: jest.fn().mockResolvedValue(undefined),
    } as any,
    reportService: {} as any,
    formGenerationService: {} as any,
    userInteractionService: {} as any,
  };
}

describe('LogReasoningTool', () => {
  let tool: LogReasoningTool;

  beforeEach(() => {
    tool = new LogReasoningTool();
  });

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = tool.getMetadata();
      expect(meta.name).toBe('log_reasoning');
      expect(meta.description).toBeDefined();
    });
  });

  describe('buildSchema', () => {
    it('should define description and reasoning fields', () => {
      const schema = (tool as any).buildSchema();
      const shape = schema.shape;
      expect(shape.description).toBeDefined();
      expect(shape.reasoning).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should log agent decision to timeline service', async () => {
      const ctx = createMockAgentContext();
      const result = await (tool as any).execute(
        { description: 'Checking CPU usage', reasoning: 'High load reported' },
        ctx,
      );

      expect(ctx.timelineService.logAgentDecision).toHaveBeenCalledWith(
        'test-session-123',
        'Checking CPU usage',
        'High load reported',
      );
      expect(JSON.parse(result)).toEqual({ success: true });
    });
  });

  describe('toLangChainTool', () => {
    it('should return a DynamicStructuredTool', () => {
      const ctx = createMockAgentContext();
      const lcTool = tool.toLangChainTool(ctx);
      expect(lcTool.name).toBe('log_reasoning');
      expect(lcTool.description).toBeDefined();
    });
  });
});

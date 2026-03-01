import { ReportProblemTool } from '../agent/report-problem.tool';
import type { AgentContext } from '../agent/base-agent-tool';

function createMockAgentContext(): AgentContext {
  return {
    sessionId: 'test-session-456',
    llm: {} as any,
    timelineService: {
      logAgentDecision: jest.fn().mockResolvedValue(undefined),
      logToolExecution: jest.fn().mockResolvedValue(undefined),
      logProblemDetected: jest.fn().mockResolvedValue(undefined),
      logUserInteraction: jest.fn().mockResolvedValue(undefined),
    } as any,
    reportService: {
      createReport: jest.fn().mockResolvedValue({ id: 'report-001' }),
    } as any,
    formGenerationService: {} as any,
    userInteractionService: {} as any,
  };
}

describe('ReportProblemTool', () => {
  let tool: ReportProblemTool;

  beforeEach(() => {
    tool = new ReportProblemTool();
  });

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = tool.getMetadata();
      expect(meta.name).toBe('report_problem');
    });
  });

  describe('buildSchema', () => {
    it('should define all required fields', () => {
      const schema = (tool as any).buildSchema();
      const shape = schema.shape;
      expect(shape.category).toBeDefined();
      expect(shape.severity).toBeDefined();
      expect(shape.title).toBeDefined();
      expect(shape.description).toBeDefined();
      expect(shape.explanation).toBeDefined();
      expect(shape.metrics).toBeDefined();
      expect(shape.recommendations).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should create a report and log to timeline', async () => {
      const ctx = createMockAgentContext();
      const input = {
        category: 'cpu',
        severity: 'warning',
        title: 'High CPU usage',
        description: 'CPU is at 95%',
        explanation: 'Process X is consuming resources',
        metrics: '{"cpuPercent": 95}',
        recommendations: 'Kill zombie processes, Add more cores',
      };

      const result = await (tool as any).execute(input, ctx);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.reportId).toBe('report-001');
      expect(ctx.reportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-456',
          category: 'cpu',
          severity: 'warning',
          title: 'High CPU usage',
          metrics: { cpuPercent: 95 },
          recommendations: ['Kill zombie processes', 'Add more cores'],
        }),
      );
      expect(ctx.timelineService.logProblemDetected).toHaveBeenCalledWith(
        'test-session-456',
        '[WARNING] High CPU usage',
        { reportId: 'report-001', category: 'cpu', severity: 'warning' },
      );
    });

    it('should handle invalid JSON in metrics', async () => {
      const ctx = createMockAgentContext();
      const input = {
        category: 'memory',
        severity: 'critical',
        title: 'OOM',
        description: 'Out of memory',
        explanation: 'Too many processes',
        metrics: 'not valid json',
        recommendations: 'Restart',
      };

      await (tool as any).execute(input, ctx);

      expect(ctx.reportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: { raw: 'not valid json' },
        }),
      );
    });
  });
});

import { CpuUtilizationTool } from '../system/cpu/cpu-utilization.tool';
import { ToolCategory, MetricLevel } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('CpuUtilizationTool', () => {
  const makeTool = () => new CpuUtilizationTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('cpu_utilization');
      expect(meta.category).toBe(ToolCategory.CPU);
      expect(meta.level).toBe(MetricLevel.SYSTEM);
      expect(meta.platform).toContain('linux');
    });
  });

  describe('getVisualization', () => {
    it('should return a donut chart spec', () => {
      const viz = makeTool().getVisualization();
      expect(viz).toBeDefined();
      expect(viz!.charts).toHaveLength(1);
      expect(viz!.charts[0].type).toBe('donut');
      expect(viz!.charts[0].slices!.length).toBeGreaterThan(0);
    });
  });

  describe('buildCommand', () => {
    it('should use default 1s interval', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('sleep 1');
    });

    it('should respect custom interval', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ sampleIntervalMs: 2000 });
      expect(cmd).toContain('sleep 2');
    });
  });

  describe('parseOutput', () => {
    it('should parse valid /proc/stat output', () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 2',
        'cpu  200 20 100 900 30 10 6 4',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.userPercent).toBeDefined();
      expect(result.systemPercent).toBeDefined();
      expect(result.idlePercent).toBeDefined();
      expect(result.totalUsedPercent).toBeDefined();

      const total =
        result.userPercent +
        result.nicePercent +
        result.systemPercent +
        result.idlePercent +
        result.iowaitPercent +
        result.irqPercent +
        result.softirqPercent +
        result.stealPercent;
      expect(Math.round(total)).toBe(100);
    });

    it('should handle insufficient samples', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('cpu  100 10 50 800 20 5 3 2', '');
      expect(result.error).toBe('Insufficient samples from /proc/stat');
    });

    it('should handle zero CPU time difference', () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 2',
        'cpu  100 10 50 800 20 5 3 2',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');
      expect(result.error).toBe('No CPU time difference between samples');
    });
  });

  describe('execute (integration)', () => {
    it('should return parsed metrics on success', async () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 2',
        'cpu  200 20 100 900 30 10 6 4',
      ].join('\n');
      const conn = createMockConnection(stdout);
      const tool = new CpuUtilizationTool(conn);
      const result = await tool.execute({});

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('cpu_utilization');
      expect(result.data.userPercent).toBeDefined();
    });
  });
});

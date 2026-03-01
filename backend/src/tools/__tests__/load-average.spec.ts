import { LoadAverageTool } from '../system/cpu/load-average.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('LoadAverageTool', () => {
  const makeTool = () => new LoadAverageTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('load_average');
      expect(meta.category).toBe(ToolCategory.CPU);
    });
  });

  describe('getVisualization', () => {
    it('should return a bar chart spec', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('bar');
      expect(viz!.charts[0].slices).toHaveLength(3);
    });
  });

  describe('buildCommand', () => {
    it('should read /proc/loadavg and nproc', () => {
      const tool = makeTool() as any;
      expect(tool.buildCommand({})).toBe('cat /proc/loadavg && nproc');
    });
  });

  describe('parseOutput', () => {
    it('should parse load averages with 4-core system', () => {
      const stdout = '1.50 2.00 3.00 2/150 12345\n4\n';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.load1m).toBe(1.5);
      expect(result.load5m).toBe(2.0);
      expect(result.load15m).toBe(3.0);
      expect(result.cpuCount).toBe(4);
      expect(result.loadPerCpu1m).toBe(0.38);
      expect(result.loadPerCpu5m).toBe(0.5);
      expect(result.loadPerCpu15m).toBe(0.75);
      expect(result.runningProcesses).toBe(2);
      expect(result.totalProcesses).toBe(150);
      expect(result.isOverloaded).toBe(false);
    });

    it('should detect overloaded state', () => {
      const stdout = '8.5 6.00 3.00 5/200 9999\n4\n';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.isOverloaded).toBe(true);
    });
  });
});

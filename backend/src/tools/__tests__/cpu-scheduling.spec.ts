import { CpuSchedulingTool } from '../system/cpu/cpu-scheduling.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('CpuSchedulingTool', () => {
  const makeTool = () => new CpuSchedulingTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('cpu_scheduling');
      expect(meta.category).toBe(ToolCategory.CPU);
    });
  });

  describe('buildCommand', () => {
    it('should read schedstat and cpuinfo', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('/proc/schedstat');
      expect(cmd).toContain('/proc/cpuinfo');
    });
  });

  describe('parseOutput', () => {
    it('should parse schedstat output', () => {
      const schedstat = [
        'cpu0 1000 2000 3000 4000',
        'cpu1 500 1500 2500 3500',
      ].join('\n');
      const stdout = `${schedstat}\n---SEP---\n4\n---SEP---\n4`;

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.cpuCount).toBe(4);
      expect(result.schedstatAvailable).toBe(true);
      expect(result.totalYieldCount).toBe(1500);
      expect(result.totalScheduleCount).toBe(3500);
      expect(result.totalRunTimeNs).toBe(5500);
      expect(result.totalWaitTimeNs).toBe(7500);
      expect(result.avgScheduleLatencyNs).toBe(Math.round(7500 / 3500));
    });

    it('should handle unavailable schedstat', () => {
      const stdout = 'schedstat_unavailable\n---SEP---\n2\n---SEP---\n2';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.schedstatAvailable).toBe(false);
      expect(result.cpuCount).toBe(2);
    });
  });
});

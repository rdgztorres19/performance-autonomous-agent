import { KernelMetricsTool } from '../system/kernel/kernel-metrics.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('KernelMetricsTool', () => {
  const makeTool = () => new KernelMetricsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('kernel_metrics');
      expect(meta.category).toBe(ToolCategory.KERNEL);
    });
  });

  describe('getVisualization', () => {
    it('should return radialBar chart for FD usage', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('radialBar');
      expect(viz!.charts[0].gaugeField).toBe('fdUsagePercent');
    });
  });

  describe('parseOutput', () => {
    it('should parse all kernel metric sections', () => {
      const stdout = [
        '5.15.0-generic',
        '---SEP---',
        '3200  0  100000',
        '---SEP---',
        '86400.50 172000.00',
        '---SEP---',
        '65536',
        '---SEP---',
        '128',
        '---SEP---',
        '[Wed Jan  1 10:00:00 2025] some error message',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.kernelVersion).toBe('5.15.0-generic');
      expect(result.openFileDescriptors).toBe(3200);
      expect(result.freeFileDescriptors).toBe(0);
      expect(result.maxFileDescriptors).toBe(100000);
      expect(result.fdUsagePercent).toBe(3.2);
      expect(result.uptimeSeconds).toBe(86401);
      expect(result.uptimeHours).toBe(24);
      expect(result.threadsMax).toBe(65536);
      expect(result.somaxconn).toBe(128);
      expect(result.hasDmesgErrors).toBe(true);
      expect(result.recentDmesgErrors).toHaveLength(1);
    });

    it('should handle unavailable dmesg', () => {
      const stdout = [
        '6.1.0',
        '---SEP---',
        '100  0  10000',
        '---SEP---',
        '3600.0 1000.0',
        '---SEP---',
        '32768',
        '---SEP---',
        '128',
        '---SEP---',
        'dmesg_unavailable',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.hasDmesgErrors).toBe(false);
      expect(result.recentDmesgErrors).toEqual([]);
    });
  });
});

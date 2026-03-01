import { VirtualizationMetricsTool } from '../system/virtualization/virtualization-metrics.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('VirtualizationMetricsTool', () => {
  const makeTool = () => new VirtualizationMetricsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('virtualization_metrics');
      expect(meta.category).toBe(ToolCategory.VIRTUALIZATION);
    });
  });

  describe('parseOutput', () => {
    it('should parse container environment with docker cgroups', () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 12',
        '---SEP---',
        '0::/docker/abc123',
        '---SEP---',
        '100000',
        '---SEP---',
        '536870912',
        '---SEP---',
        'nr_periods 1000\nnr_throttled 50\nthrottled_time 5000000',
        '---SEP---',
        'kvm',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.isContainer).toBe(true);
      expect(result.stealPercent).toBeGreaterThan(0);
      expect(result.cpuQuota).toBe(100000);
      expect(result.memoryLimitMb).toBe(512);
      expect(result.throttledCount).toBe(50);
      expect(result.throttledTimeNs).toBe(5000000);
      expect(result.virtualizationType).toBe('kvm');
    });

    it('should handle non-container environment', () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 0',
        '---SEP---',
        '0::/',
        '---SEP---',
        'quota_unavailable',
        '---SEP---',
        'memlimit_unavailable',
        '---SEP---',
        'cpustat_unavailable',
        '---SEP---',
        'none',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.isContainer).toBe(false);
      expect(result.stealPercent).toBe(0);
      expect(result.cpuQuota).toBe('unlimited');
      expect(result.memoryLimitMb).toBe('unlimited');
      expect(result.throttledCount).toBe(0);
      expect(result.virtualizationType).toBe('none');
    });

    it('should recognize kubepods as container', () => {
      const stdout = [
        'cpu  100 10 50 800 20 5 3 0',
        '---SEP---',
        '0::/kubepods/pod-xyz',
        '---SEP---',
        'quota_unavailable',
        '---SEP---',
        'memlimit_unavailable',
        '---SEP---',
        'cpustat_unavailable',
        '---SEP---',
        'detect_unavailable',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.isContainer).toBe(true);
      expect(result.virtualizationType).toBe('unknown');
    });
  });
});

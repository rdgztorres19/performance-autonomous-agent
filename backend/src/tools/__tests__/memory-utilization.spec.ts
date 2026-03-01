import { MemoryUtilizationTool } from '../system/memory/memory-utilization.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('MemoryUtilizationTool', () => {
  const makeTool = () => new MemoryUtilizationTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('memory_utilization');
      expect(meta.category).toBe(ToolCategory.MEMORY);
    });
  });

  describe('getVisualization', () => {
    it('should return donut + radialBar charts', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts).toHaveLength(2);
      expect(viz!.charts[0].type).toBe('donut');
      expect(viz!.charts[1].type).toBe('radialBar');
    });
  });

  describe('buildCommand', () => {
    it('should read /proc/meminfo', () => {
      const tool = makeTool() as any;
      expect(tool.buildCommand({})).toBe('cat /proc/meminfo');
    });
  });

  describe('parseOutput', () => {
    it('should parse /proc/meminfo correctly', () => {
      const stdout = [
        'MemTotal:       16384000 kB',
        'MemFree:         4096000 kB',
        'MemAvailable:    8192000 kB',
        'Buffers:          512000 kB',
        'Cached:          2048000 kB',
        'Slab:             256000 kB',
        'SwapTotal:       4096000 kB',
        'SwapFree:        3072000 kB',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.totalMb).toBe(16000);
      expect(result.freeMb).toBe(4000);
      expect(result.availableMb).toBe(8000);
      expect(result.buffersMb).toBe(500);
      expect(result.cachedMb).toBe(2000);
      expect(result.usedMb).toBe(Math.round((16384000 - 4096000 - 512000 - 2048000) / 1024));
      expect(result.swapTotalMb).toBe(4000);
      expect(result.swapUsedMb).toBe(1000);
      expect(result.usedPercent).toBeGreaterThan(0);
      expect(result.usedPercent).toBeLessThan(100);
      expect(result.swapUsedPercent).toBeGreaterThan(0);
    });

    it('should handle zero total memory', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('', '');
      expect(result.totalMb).toBe(0);
      expect(result.usedPercent).toBe(0);
    });

    it('should default SwapTotal to 0 when missing', () => {
      const stdout = [
        'MemTotal:       8192000 kB',
        'MemFree:        2048000 kB',
        'MemAvailable:   4096000 kB',
        'Buffers:          128000 kB',
        'Cached:          1024000 kB',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');
      expect(result.swapTotalMb).toBe(0);
      expect(result.swapUsedPercent).toBe(0);
    });
  });
});

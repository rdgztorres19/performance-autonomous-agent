import { CpuPerCoreTool } from '../system/cpu/cpu-per-core.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('CpuPerCoreTool', () => {
  const makeTool = () => new CpuPerCoreTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('cpu_per_core');
      expect(meta.category).toBe(ToolCategory.CPU);
    });
  });

  describe('buildCommand', () => {
    it('should use default 1s interval', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('sleep 1');
      expect(cmd).toContain('grep');
      expect(cmd).toContain('/proc/stat');
    });
  });

  describe('parseOutput', () => {
    it('should parse per-core CPU output', () => {
      const sample1 = 'cpu0 100 5 50 800 10 2 1 0\ncpu1 90 4 45 850 8 1 0 0';
      const sample2 = 'cpu0 200 10 100 900 20 4 2 0\ncpu1 180 8 90 950 15 2 0 0';
      const stdout = `${sample1}\n---SEP---\n${sample2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.cores).toBeDefined();
      expect(result.cores.length).toBe(2);
      expect(result.coreCount).toBe(2);
      const c0 = result.cores[0];
      expect(c0.core).toBe('cpu0');
      expect(typeof c0.userPercent).toBe('number');
      expect(typeof c0.systemPercent).toBe('number');
      expect(typeof c0.idlePercent).toBe('number');
    });

    it('should handle insufficient samples', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('cpu0 100 5 50 800', '');
      expect(result.error).toBe('Insufficient samples from /proc/stat');
    });
  });
});

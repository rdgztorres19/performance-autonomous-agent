import { ProcessCpuAffinityTool } from '../application/process/process-cpu-affinity.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessCpuAffinityTool', () => {
  const makeTool = () => new ProcessCpuAffinityTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_cpu_affinity');
      expect(meta.category).toBe(ToolCategory.APPLICATION_CPU);
    });
  });

  describe('parseOutput', () => {
    it('should parse hex mask', () => {
      const stderr = "pid 1234's current affinity mask: f";
      const tool = makeTool() as any;
      const result = tool.parseOutput('', stderr);

      expect(result.affinityMask).toBeDefined();
      expect(Array.isArray(result.cpus)).toBe(true);
      expect(result.cpus).toContain(0);
      expect(result.cpus).toContain(1);
      expect(result.cpus).toContain(2);
      expect(result.cpus).toContain(3);
      expect(result.cpuCount).toBe(result.cpus.length);
    });

    it('should parse list format', () => {
      const out = "pid 1's current affinity mask: 0,1,2,3";
      const tool = makeTool() as any;
      const result = tool.parseOutput(out, '');

      expect(result.cpus).toEqual([0, 1, 2, 3]);
      expect(result.cpuCount).toBe(4);
    });

    it('should handle taskset_unavailable', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('taskset_unavailable', '');
      expect(result.error).toContain('taskset not available');
    });
  });
});

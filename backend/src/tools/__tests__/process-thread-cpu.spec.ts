import { ProcessThreadCpuTool } from '../application/process/process-thread-cpu.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessThreadCpuTool', () => {
  const makeTool = () => new ProcessThreadCpuTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_thread_cpu');
      expect(meta.category).toBe(ToolCategory.APPLICATION_THREADING);
    });
  });

  describe('parseOutput', () => {
    it('should parse ps and two stat samples', () => {
      const ps = '  PID   TID PSR COMMAND\n  100  100  2 process\n  100  101  0 process';
      const s1 = '100 500 100\n101 200 50';
      const s2 = '100 600 150\n101 250 75';

      const stdout = `${ps}\n---SEP---\n${s1}\n---SEP---\n${s2}`;
      const tool = makeTool() as any;
      (tool as any).sampleIntervalSec = 0.5;
      const result = tool.parseOutput(stdout, '');

      expect(result.threads).toHaveLength(2);
      expect(result.totalThreads).toBe(2);
      const t0 = result.threads[0];
      expect(t0.tid).toBeDefined();
      expect(t0.psr).toBeDefined();
      expect(t0.cpuPercent).toBeDefined();
      expect(t0.userPercent).toBeDefined();
      expect(t0.systemPercent).toBeDefined();
    });

    it('should handle ps_unavailable', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('ps_unavailable\n---SEP---\n\n---SEP---\n', '');
      expect(result.error).toBe('ps -eLo not available');
    });

    it('should handle insufficient data', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('', '');
      expect(result.error).toBe('Insufficient data');
    });
  });
});

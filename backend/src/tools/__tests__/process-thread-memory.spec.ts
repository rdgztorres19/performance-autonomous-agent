import { ProcessThreadMemoryTool } from '../application/process/process-thread-memory.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessThreadMemoryTool', () => {
  const makeTool = () => new ProcessThreadMemoryTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_thread_memory');
      expect(meta.category).toBe(ToolCategory.APPLICATION_MEMORY);
    });
  });

  describe('parseOutput', () => {
    it('should parse per-thread status', () => {
      const stdout = [
        'TID=100 Name: main VmRSS: 10240 kB VmSize: 20480 kB ',
        'TID=101 Name: worker VmRSS: 5120 kB VmSize: 10240 kB ',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.threads).toHaveLength(2);
      expect(result.totalThreads).toBe(2);
      expect(result.totalVmRssKb).toBe(15360);
      expect(result.totalVmRssMb).toBe(15);
      expect(result.threads[0].vmRssKb).toBe(10240);
      expect(result.threads[0].vmRssMb).toBe(10);
    });

    it('should handle empty output', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('', '');
      expect(result.threads).toHaveLength(0);
      expect(result.totalVmRssKb).toBe(0);
    });
  });
});

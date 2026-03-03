import { ProcessMemoryTool } from '../application/process/process-memory.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessMemoryTool', () => {
  const makeTool = () => new ProcessMemoryTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_memory');
      expect(meta.category).toBe(ToolCategory.APPLICATION_MEMORY);
    });
  });

  describe('buildCommand', () => {
    it('should list top processes by default', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('ps aux --sort=-%mem');
    });

    it('should query specific PID when provided', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 555 });
      expect(cmd).toContain('/proc/555/status');
      expect(cmd).toContain('/proc/555/smaps_rollup');
    });
  });

  describe('parseOutput', () => {
    it('should parse top processes list', () => {
      const stdout = [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        'mysql     2000  2.0 15.0 2000000 300000 ?      Ssl  Jan01  50:00 /usr/sbin/mysqld',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.topProcesses).toHaveLength(1);
      expect(result.topProcesses[0].memPercent).toBe(15.0);
      expect(result.topProcesses[0].rssKb).toBe(300000);
      expect(result.topProcesses[0].rssMb).toBe(293);
      expect(result.topProcesses[0].command).toBe('/usr/sbin/mysqld');
    });

    it('should parse per-PID /proc/status output', () => {
      const stdout = [
        'Name:\tmysqld',
        'VmSize:\t2000000 kB',
        'VmRSS:\t300000 kB',
        'VmSwap:\t1024 kB',
        'VmPeak:\t2100000 kB',
        'VmData:\t1500000 kB',
        'VmStk:\t8192 kB',
        'Threads:\t32',
        '---SEP---',
        '1 (mysqld) S 0 1 1 0 0 0 5000 0 100 0',
        '---SEP---',
        'smaps_unavailable',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.name).toBe('mysqld');
      expect(result.vmRssKb).toBe(300000);
      expect(result.vmSwapKb).toBe(1024);
      expect(result.threads).toBe(32);
      expect(result.vmRssMb).toBe(293);
      expect(result.vmSizeMb).toBe(1953);
      expect(result.minflt).toBe(5000);
      expect(result.majflt).toBe(100);
    });
  });
});

import { SystemLimitsTool } from '../system/kernel/system-limits.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('SystemLimitsTool', () => {
  const makeTool = () => new SystemLimitsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('system_limits');
      expect(meta.category).toBe(ToolCategory.KERNEL);
    });
  });

  describe('parseOutput', () => {
    it('should parse kernel limits and ulimit', () => {
      const ulimit = [
        'open files                      (-n) 1024',
        'max user processes              (-u) 4096',
        'stack size              (kbytes, -s) 8192',
      ].join('\n');
      const stdout = [
        '128 0 65536',
        '65536',
        '32768',
        '12345',
        '128',
        '512',
        '0',
        ulimit,
      ].join('\n---SEP---\n');
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.kernel).toBeDefined();
      expect(result.kernel.somaxconn).toBe(128);
      expect(result.kernel.fileMax).toBe(65536);
      expect(result.systemFds.open).toBe(128);
      expect(result.systemFds.max).toBe(65536);
      expect(result.ulimitAvailable).toBe(true);
      expect(result.ulimit.open_files).toBe(1024);
    });

    it('should handle ulimit unavailable', () => {
      const stdout = [
        '128 0 65536',
        '65536',
        '0', '0', '128', '0', '0',
        'ulimit_unavailable',
      ].join('\n---SEP---\n');
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.ulimitAvailable).toBe(false);
    });
  });
});

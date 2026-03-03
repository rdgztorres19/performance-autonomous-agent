import { OomKillsTool } from '../system/memory/oom-kills.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('OomKillsTool', () => {
  const makeTool = () => new OomKillsTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('oom_kills');
      expect(meta.category).toBe(ToolCategory.MEMORY);
    });
  });

  describe('parseOutput', () => {
    it('should parse vmstat and dmesg output', () => {
      const stdout = 'oom_kill 2\n---SEP---\nOut of memory: Killed process 1234 (node)\nOut of memory: Killed process 5678 (java)';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.oomKillsFromVmstat).toBe(2);
      expect(result.oomEventsCount).toBe(2);
      expect(result.oomEvents).toHaveLength(2);
      expect(result.dmesgAvailable).toBe(true);
    });

    it('should handle no OOM events', () => {
      const stdout = 'oom_kill 0\n---SEP---\ndmesg_unavailable';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.oomKillsFromVmstat).toBe(0);
      expect(result.oomEventsCount).toBe(0);
      expect(result.dmesgAvailable).toBe(false);
    });
  });
});

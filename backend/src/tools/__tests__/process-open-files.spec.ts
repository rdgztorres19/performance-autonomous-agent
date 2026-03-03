import { ProcessOpenFilesTool } from '../application/process/process-open-files.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessOpenFilesTool', () => {
  const makeTool = () => new ProcessOpenFilesTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_open_files');
      expect(meta.category).toBe(ToolCategory.APPLICATION_IO);
    });
  });

  describe('parseOutput', () => {
    it('should parse ls -l fd output', () => {
      const stdout = [
        'lr-x------ 1 user user 64 Feb 28 10:00 0 -> /dev/null',
        'l-wx------ 1 user user 64 Feb 28 10:00 1 -> /dev/null',
        'l-wx------ 1 user user 64 Feb 28 10:00 2 -> /dev/null',
        'lrwx------ 1 user user 64 Feb 28 10:00 3 -> socket:[12345]',
        'lrwx------ 1 user user 64 Feb 28 10:00 4 -> pipe:[67890]',
      ].join('\n');

      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.openFiles).toHaveLength(5);
      expect(result.totalCount).toBe(5);
      expect(result.byType.socket).toBe(1);
      expect(result.byType.pipe).toBe(1);
      expect(result.byType.dev).toBe(3);
      expect(result.openFiles[3].target).toContain('socket');
      expect(result.openFiles[3].type).toBe('socket');
    });

    it('should handle fd_unavailable', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('fd_unavailable', '');
      expect(result.error).toContain('Cannot read');
    });
  });
});

import { ProcessIoTool } from '../application/process/process-io.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('ProcessIoTool', () => {
  const makeTool = () => new ProcessIoTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('process_io');
      expect(meta.category).toBe(ToolCategory.APPLICATION_IO);
    });
  });

  describe('getVisualization', () => {
    it('should return two charts (bar + radialBar)', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts).toHaveLength(2);
      expect(viz!.charts[0].type).toBe('bar');
      expect(viz!.charts[1].type).toBe('radialBar');
    });
  });

  describe('buildCommand', () => {
    it('should read /proc/pid/io and fd info', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ pid: 999 });
      expect(cmd).toContain('/proc/999/io');
      expect(cmd).toContain('/proc/999/fd');
      expect(cmd).toContain('/proc/999/limits');
    });
  });

  describe('parseOutput', () => {
    it('should parse I/O counters and FD info', () => {
      const io = [
        'rchar: 1000000',
        'wchar: 500000',
        'syscr: 5000',
        'syscw: 3000',
        'read_bytes: 2097152',
        'write_bytes: 1048576',
        'cancelled_write_bytes: 0',
      ].join('\n');
      const fdCount = '150';
      const limits = 'Max open files            1024                 65536                files';

      const stdout = `${io}\n---SEP---\n${fdCount}\n---SEP---\n${limits}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.readBytes).toBe(2097152);
      expect(result.writeBytes).toBe(1048576);
      expect(result.readMb).toBe(2);
      expect(result.writeMb).toBe(1);
      expect(result.syscallReads).toBe(5000);
      expect(result.syscallWrites).toBe(3000);
      expect(result.openFileDescriptors).toBe(150);
      expect(result.fdSoftLimit).toBe(1024);
      expect(result.fdHardLimit).toBe(65536);
      expect(result.fdUsagePercent).toBeGreaterThan(0);
    });

    it('should handle unavailable /proc/pid/io', () => {
      const stdout = 'io_unavailable\n---SEP---\n0\n---SEP---\nlimits_unavailable';
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');
      expect(result.error).toContain('Cannot read');
    });
  });
});

import { DiskThroughputTool } from '../system/disk/disk-throughput.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('DiskThroughputTool', () => {
  const makeTool = () => new DiskThroughputTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('disk_throughput');
      expect(meta.category).toBe(ToolCategory.DISK);
    });
  });

  describe('buildCommand', () => {
    it('should filter all block devices by default', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('sd[a-z]+');
      expect(cmd).toContain('nvme');
    });

    it('should filter specific device when provided', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({ device: 'sda' });
      expect(cmd).toContain('sda');
    });
  });

  describe('parseOutput', () => {
    it('should compute throughput from two samples', () => {
      const sample1 = '   8    0 sda 1000 0 2000 0 500 0 1000 0 0 0 0';
      const sample2 = '   8    0 sda 1100 0 4000 0 600 0 2000 0 0 0 0';

      const stdout = `${sample1}\n---SEP---\n${sample2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.devices).toHaveLength(1);
      const dev = result.devices[0];
      expect(dev.device).toBe('sda');
      expect(dev.readIops).toBe(100);
      expect(dev.writeIops).toBe(100);
      expect(dev.totalIops).toBe(200);
      expect(dev.readMBps).toBeGreaterThanOrEqual(0);
      expect(dev.writeMBps).toBeGreaterThanOrEqual(0);
    });

    it('should handle insufficient samples', () => {
      const tool = makeTool() as any;
      const result = tool.parseOutput('  8  0 sda 100 0 200 0 50 0 100 0 0 0 0', '');
      expect(result.error).toBe('Insufficient samples');
    });

    it('should handle zero write IOPS for readWriteRatio', () => {
      const sample1 = '   8    0 sda 1000 0 2000 0 0 0 0 0 0 0 0';
      const sample2 = '   8    0 sda 1100 0 4000 0 0 0 0 0 0 0 0';

      const stdout = `${sample1}\n---SEP---\n${sample2}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.devices[0].readWriteRatio).toBe(Infinity);
    });
  });
});

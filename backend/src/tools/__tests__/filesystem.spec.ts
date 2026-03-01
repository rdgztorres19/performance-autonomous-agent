import { FileSystemTool } from '../system/disk/filesystem.tool';
import { ToolCategory } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

describe('FileSystemTool', () => {
  const makeTool = () => new FileSystemTool(createMockConnection());

  describe('getMetadata', () => {
    it('should return correct metadata', () => {
      const meta = makeTool().getMetadata();
      expect(meta.name).toBe('filesystem_usage');
      expect(meta.category).toBe(ToolCategory.FILE_SYSTEM);
    });
  });

  describe('getVisualization', () => {
    it('should return horizontalBar chart', () => {
      const viz = makeTool().getVisualization();
      expect(viz!.charts[0].type).toBe('horizontalBar');
      expect(viz!.charts[0].arrayField).toBe('filesystems');
    });
  });

  describe('buildCommand', () => {
    it('should use df -hT and df -i', () => {
      const tool = makeTool() as any;
      const cmd = tool.buildCommand({});
      expect(cmd).toContain('df -hT');
      expect(cmd).toContain('df -i');
    });
  });

  describe('parseOutput', () => {
    it('should parse df output and merge inode data', () => {
      const df = [
        'Filesystem     Type  Size  Used Avail Use% Mounted on',
        '/dev/sda1      ext4  100G   50G   50G  50% /',
        'tmpfs          tmpfs  8G    0B    8G   0% /tmp',
      ].join('\n');
      const inode = [
        'Filesystem     Inodes  IUsed  IFree IUse% Mounted on',
        '/dev/sda1      6553600 123456 6430144 2% /',
      ].join('\n');

      const stdout = `${df}\n---SEP---\n${inode}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      expect(result.filesystems).toBeDefined();
      expect(Array.isArray(result.filesystems)).toBe(true);
      const rootFs = result.filesystems.find((f: any) => f.mountPoint === '/');
      expect(rootFs).toBeDefined();
      expect(rootFs.type).toBe('ext4');
      expect(rootFs.usedPercent).toBe('50%');
      expect(rootFs.inodesTotal).toBe(6553600);
    });

    it('should filter out /dev, /sys, /proc mount points', () => {
      const df = [
        'Filesystem     Type  Size  Used Avail Use% Mounted on',
        'devtmpfs       devtmpfs  8G    0B    8G   0% /dev',
        'proc           proc   0B    0B    0B   0% /proc',
        '/dev/sda1      ext4  100G  50G   50G  50% /',
      ].join('\n');
      const inode = 'Filesystem     Inodes  IUsed  IFree IUse% Mounted on';
      const stdout = `${df}\n---SEP---\n${inode}`;
      const tool = makeTool() as any;
      const result = tool.parseOutput(stdout, '');

      const mountPoints = result.filesystems.map((f: any) => f.mountPoint);
      expect(mountPoints).not.toContain('/dev');
      expect(mountPoints).not.toContain('/proc');
    });
  });
});

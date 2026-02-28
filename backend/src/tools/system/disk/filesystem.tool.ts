import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class FileSystemTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'filesystem_usage',
      description:
        'Collects file system usage: space used/available, inode usage, mount options for all mounted filesystems using df and mount commands.',
      category: ToolCategory.FILE_SYSTEM,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'df -hT && echo "---SEP---" && df -i';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [dfRaw, inodeRaw] = stdout.split('---SEP---').map((s) => s.trim());

    const filesystems: Record<string, unknown>[] = [];
    const dfLines = (dfRaw ?? '').split('\n').slice(1);
    const inodeLines = (inodeRaw ?? '').split('\n').slice(1);

    const inodeMap: Record<string, { inodesTotal: number; inodesUsed: number; inodesUsedPercent: string }> = {};
    for (const line of inodeLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        inodeMap[parts[5]] = {
          inodesTotal: parseInt(parts[1], 10) || 0,
          inodesUsed: parseInt(parts[2], 10) || 0,
          inodesUsedPercent: parts[4] ?? '0%',
        };
      }
    }

    for (const line of dfLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 7) continue;
      const mountPoint = parts[6];
      if (mountPoint.startsWith('/dev') || mountPoint.startsWith('/sys') || mountPoint.startsWith('/proc')) continue;

      filesystems.push({
        filesystem: parts[0],
        type: parts[1],
        size: parts[2],
        used: parts[3],
        available: parts[4],
        usedPercent: parts[5],
        mountPoint,
        ...inodeMap[mountPoint],
      });
    }

    return { filesystems };
  }
}

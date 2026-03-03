import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

/**
 * Lists open file descriptors and their targets (path, socket, pipe, etc.)
 * using ls -l /proc/pid/fd. No external tools.
 */
export class ProcessOpenFilesTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'FD by Type',
        unit: 'count',
        dynamicMapField: 'byType',
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'process_open_files',
      description:
        'Lists open file descriptors with their targets (paths, sockets, pipes). Uses ls -l /proc/<pid>/fd.',
      category: ToolCategory.APPLICATION_IO,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to inspect',
          type: 'number',
          required: true,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    return `ls -l /proc/${pid}/fd 2>/dev/null | tail -n +2 || echo "fd_unavailable"`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    if (stdout.includes('fd_unavailable')) {
      return { error: 'Cannot read /proc/<pid>/fd. May require elevated permissions.' };
    }

    const files: Record<string, unknown>[] = [];
    const byType: Record<string, number> = { file: 0, socket: 0, pipe: 0, anon: 0, dev: 0, other: 0 };

    for (const line of stdout.split('\n').filter(Boolean)) {
      const arrow = line.indexOf('->');
      if (arrow < 0) continue;

      const left = line.slice(0, arrow).trim();
      const target = line.slice(arrow + 2).trim();

      const fdMatch = left.match(/\d+$/);
      const fd = fdMatch ? parseInt(fdMatch[0], 10) : -1;

      const type = this.classifyTarget(target);
      byType[type] = (byType[type] ?? 0) + 1;

      files.push({
        fd,
        target,
        type,
      });
    }

    return {
      openFiles: files,
      totalCount: files.length,
      byType,
    };
  }

  private classifyTarget(target: string): string {
    if (target.startsWith('socket:')) return 'socket';
    if (target.startsWith('pipe:')) return 'pipe';
    if (target.startsWith('anon_inode:')) return 'anon';
    if (target.startsWith('/dev/')) return 'dev';
    if (target.startsWith('/') || target.includes(':')) return 'file';
    return 'other';
  }
}

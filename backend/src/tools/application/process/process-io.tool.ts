import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class ProcessIoTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Process I/O',
        unit: 'MB',
        slices: [
          { label: 'Read', field: 'readMb', color: '#3b82f6' },
          { label: 'Write', field: 'writeMb', color: '#ef4444' },
        ],
      }, {
        type: 'radialBar',
        title: 'FD Usage',
        unit: '%',
        gaugeField: 'fdUsagePercent',
        gaugeMax: 100,
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'process_io',
      description:
        'Collects per-process I/O metrics: read/write bytes, syscalls, open file descriptors from /proc/<pid>/io and /proc/<pid>/fd.',
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
    return [
      `cat /proc/${pid}/io 2>/dev/null || echo "io_unavailable"`,
      'echo "---SEP---"',
      `ls /proc/${pid}/fd 2>/dev/null | wc -l`,
      'echo "---SEP---"',
      `cat /proc/${pid}/limits 2>/dev/null | grep "Max open files"`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const ioRaw = parts[0] ?? '';
    if (ioRaw.includes('io_unavailable')) {
      return { error: 'Cannot read /proc/<pid>/io. May require elevated permissions.' };
    }

    const ioValues: Record<string, number> = {};
    for (const line of ioRaw.split('\n')) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (match) ioValues[match[1]] = parseInt(match[2], 10);
    }

    const openFds = parseInt(parts[1] ?? '0', 10);

    const limitsLine = parts[2] ?? '';
    const limitsMatch = limitsLine.match(/(\d+)\s+(\d+)/);
    const softLimit = limitsMatch ? parseInt(limitsMatch[1], 10) : 0;
    const hardLimit = limitsMatch ? parseInt(limitsMatch[2], 10) : 0;

    return {
      readBytes: ioValues['read_bytes'] ?? 0,
      writeBytes: ioValues['write_bytes'] ?? 0,
      readMb: Math.round((ioValues['read_bytes'] ?? 0) / 1024 / 1024 * 100) / 100,
      writeMb: Math.round((ioValues['write_bytes'] ?? 0) / 1024 / 1024 * 100) / 100,
      syscallReads: ioValues['syscr'] ?? 0,
      syscallWrites: ioValues['syscw'] ?? 0,
      cancelledWriteBytes: ioValues['cancelled_write_bytes'] ?? 0,
      openFileDescriptors: openFds,
      fdSoftLimit: softLimit,
      fdHardLimit: hardLimit,
      fdUsagePercent: softLimit > 0 ? Math.round((openFds / softLimit) * 10000) / 100 : 0,
    };
  }
}

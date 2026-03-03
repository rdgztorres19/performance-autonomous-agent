import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class KernelMetricsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'radialBar',
        title: 'File Descriptor Usage',
        unit: '%',
        gaugeField: 'fdUsagePercent',
        gaugeMax: 100,
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'kernel_metrics',
      description:
        'Collects kernel-level metrics: uptime, kernel version, file descriptor usage, somaxconn (listen queue limit), process limits, and dmesg error summary.',
      category: ToolCategory.KERNEL,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'uname -r',
      'echo "---SEP---"',
      'cat /proc/sys/fs/file-nr',
      'echo "---SEP---"',
      'cat /proc/uptime',
      'echo "---SEP---"',
      'cat /proc/sys/kernel/threads-max 2>/dev/null || echo "0"',
      'echo "---SEP---"',
      'cat /proc/sys/net/core/somaxconn 2>/dev/null || echo "128"',
      'echo "---SEP---"',
      'dmesg -T --level=err,warn 2>/dev/null | tail -20 || echo "dmesg_unavailable"',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const kernelVersion = parts[0] ?? 'unknown';

    const fileNr = (parts[1] ?? '').split(/\s+/);
    const openFileDescriptors = parseInt(fileNr[0] ?? '0', 10);
    const freeFileDescriptors = parseInt(fileNr[1] ?? '0', 10);
    const maxFileDescriptors = parseInt(fileNr[2] ?? '0', 10);

    const uptimeParts = (parts[2] ?? '').split(/\s+/);
    const uptimeSeconds = parseFloat(uptimeParts[0] ?? '0');
    const idleSeconds = parseFloat(uptimeParts[1] ?? '0');

    const threadsMax = parseInt(parts[3] ?? '0', 10);
    const somaxconn = parseInt(parts[4] ?? '128', 10);

    const dmesgRaw = parts[5] ?? '';
    const hasDmesgErrors = !dmesgRaw.includes('dmesg_unavailable') && dmesgRaw.length > 0;

    return {
      kernelVersion,
      uptimeSeconds: Math.round(uptimeSeconds),
      uptimeHours: Math.round(uptimeSeconds / 3600 * 100) / 100,
      idlePercent: uptimeSeconds > 0 ? Math.round((idleSeconds / uptimeSeconds) * 100) / 100 : 0,
      openFileDescriptors,
      freeFileDescriptors,
      maxFileDescriptors,
      fdUsagePercent: maxFileDescriptors > 0
        ? Math.round((openFileDescriptors / maxFileDescriptors) * 10000) / 100
        : 0,
      threadsMax,
      somaxconn,
      hasDmesgErrors,
      recentDmesgErrors: hasDmesgErrors ? dmesgRaw.split('\n').slice(-10) : [],
    };
  }
}

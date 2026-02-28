import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

export class DiskSaturationTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'disk_saturation',
      description:
        'Collects disk saturation metrics: utilization %, queue depth, I/O wait, and in-flight I/O from /proc/diskstats.',
      category: ToolCategory.DISK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    const filter = 'grep -E "\\b(sd[a-z]+|nvme[0-9]+n[0-9]+|vd[a-z]+)\\b"';
    return [
      `cat /proc/diskstats | ${filter}`,
      'sleep 1',
      'echo "---SEP---"',
      `cat /proc/diskstats | ${filter}`,
      'echo "---SEP---"',
      'grep iowait /proc/stat | head -1',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());
    if (parts.length < 3) return { error: 'Insufficient data' };

    const parseDevices = (text: string) => {
      const devices: Record<string, { ioTimeMs: number; weightedIoTimeMs: number; ioInProgress: number }> = {};
      for (const line of text.split('\n')) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 14) continue;
        devices[cols[2]] = {
          ioTimeMs: parseInt(cols[12], 10),
          weightedIoTimeMs: parseInt(cols[13], 10),
          ioInProgress: parseInt(cols[11], 10),
        };
      }
      return devices;
    };

    const d1 = parseDevices(parts[0]);
    const d2 = parseDevices(parts[1]);
    const devices: Record<string, unknown>[] = [];

    for (const name of Object.keys(d2)) {
      const s1 = d1[name];
      const s2 = d2[name];
      if (!s1 || !s2) continue;

      const ioTimeDiff = s2.ioTimeMs - s1.ioTimeMs;
      const utilizationPercent = Math.min(Math.round(ioTimeDiff / 10) / 10, 100);

      devices.push({
        device: name,
        utilizationPercent,
        queueDepth: s2.ioInProgress,
        weightedIoTimeDiffMs: s2.weightedIoTimeMs - s1.weightedIoTimeMs,
      });
    }

    return { devices };
  }
}

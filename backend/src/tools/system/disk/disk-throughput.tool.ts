import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class DiskThroughputTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Disk Throughput by Device',
        unit: 'MB/s',
        arrayField: 'devices',
        labelField: 'device',
        valueFields: [
          { field: 'readMBps', label: 'Read' },
          { field: 'writeMBps', label: 'Write' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'disk_throughput',
      description:
        'Collects disk throughput metrics: read/write MB/s, IOPS, and read/write ratio from /proc/diskstats. Takes two samples to calculate rates.',
      category: ToolCategory.DISK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
      parameters: [
        {
          name: 'device',
          description: 'Block device name (e.g., sda, nvme0n1). If empty, collects all devices.',
          type: 'string',
          required: false,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const device = params['device'] as string | undefined;
    const filter = device ? `grep "\\b${device}\\b"` : 'grep -E "\\b(sd[a-z]+|nvme[0-9]+n[0-9]+|vd[a-z]+)\\b"';
    return `cat /proc/diskstats | ${filter} && sleep 1 && echo "---SEP---" && cat /proc/diskstats | ${filter}`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [first, second] = stdout.split('---SEP---').map((s) => s.trim());
    if (!first || !second) return { error: 'Insufficient samples' };

    const parseDiskstats = (text: string) => {
      const devices: Record<string, Record<string, number>> = {};
      for (const line of text.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 14) continue;
        const name = parts[2];
        devices[name] = {
          readsCompleted: parseInt(parts[3], 10),
          readSectors: parseInt(parts[5], 10),
          timeReadingMs: parseInt(parts[6], 10),
          writesCompleted: parseInt(parts[7], 10),
          writeSectors: parseInt(parts[9], 10),
          timeWritingMs: parseInt(parts[10], 10),
          ioInProgress: parseInt(parts[11], 10),
          ioTimeMs: parseInt(parts[12], 10),
        };
      }
      return devices;
    };

    const d1 = parseDiskstats(first);
    const d2 = parseDiskstats(second);
    const devices: Record<string, unknown>[] = [];

    for (const name of Object.keys(d2)) {
      const s1 = d1[name];
      const s2 = d2[name];
      if (!s1 || !s2) continue;

      const readIops = s2['readsCompleted'] - s1['readsCompleted'];
      const writeIops = s2['writesCompleted'] - s1['writesCompleted'];
      const readSectors = s2['readSectors'] - s1['readSectors'];
      const writeSectors = s2['writeSectors'] - s1['writeSectors'];
      const totalIops = readIops + writeIops;
      const timeReadDelta = (s2['timeReadingMs'] ?? 0) - (s1['timeReadingMs'] ?? 0);
      const timeWriteDelta = (s2['timeWritingMs'] ?? 0) - (s1['timeWritingMs'] ?? 0);
      const awaitMs = totalIops > 0
        ? Math.round((timeReadDelta + timeWriteDelta) / totalIops * 100) / 100
        : 0;

      devices.push({
        device: name,
        readMBps: Math.round((readSectors * 512) / 1024 / 1024 * 100) / 100,
        writeMBps: Math.round((writeSectors * 512) / 1024 / 1024 * 100) / 100,
        readIops,
        writeIops,
        totalIops,
        readWriteRatio: writeIops > 0 ? Math.round((readIops / writeIops) * 100) / 100 : readIops > 0 ? Infinity : 0,
        ioInProgress: s2['ioInProgress'],
        awaitMs,
      });
    }

    return { devices };
  }
}

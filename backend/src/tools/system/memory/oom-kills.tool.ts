import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class OomKillsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'OOM Events',
        unit: 'count',
        slices: [
          { label: 'OOM Kills (vmstat)', field: 'oomKillsFromVmstat' },
          { label: 'OOM Kill Events (dmesg)', field: 'oomEventsCount' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'oom_kills',
      description:
        'Collects OOM kill information from /proc/vmstat (oom_kill counter) and dmesg (out of memory messages). Does not use journalctl.',
      category: ToolCategory.MEMORY,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'grep -E "^oom_kill" /proc/vmstat 2>/dev/null || echo "oom_kill 0"',
      'echo "---SEP---"',
      'dmesg 2>/dev/null | grep -i "out of memory" | tail -50 || echo "dmesg_unavailable"',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [vmstatRaw, dmesgRaw] = stdout.split('---SEP---').map((s) => s.trim());

    let oomKillsFromVmstat = 0;
    const vmstatMatch = (vmstatRaw ?? '').match(/oom_kill\s+(\d+)/);
    if (vmstatMatch) oomKillsFromVmstat = parseInt(vmstatMatch[1], 10);

    const dmesgLines = (dmesgRaw ?? '')
      .split('\n')
      .filter((l) => !l.includes('dmesg_unavailable') && l.trim().length > 0);

    const oomEvents = dmesgLines.map((line) => ({
      message: line.trim().slice(0, 200),
      raw: line.trim(),
    }));

    return {
      oomKillsFromVmstat,
      oomEventsCount: oomEvents.length,
      oomEvents,
      dmesgAvailable: !(dmesgRaw ?? '').includes('dmesg_unavailable'),
    };
  }
}

import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class NetworkThroughputTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Network Throughput by Interface',
        unit: 'Mbps',
        arrayField: 'interfaces',
        labelField: 'interface',
        valueFields: [
          { field: 'rxMbps', label: 'RX' },
          { field: 'txMbps', label: 'TX' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'network_throughput',
      description:
        'Collects network throughput: RX/TX bytes/sec and packets/sec per interface from /proc/net/dev with two samples.',
      category: ToolCategory.NETWORK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'cat /proc/net/dev && sleep 1 && echo "---SEP---" && cat /proc/net/dev';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const [first, second] = stdout.split('---SEP---').map((s) => s.trim());
    if (!first || !second) return { error: 'Insufficient samples' };

    const parseNetDev = (text: string) => {
      const interfaces: Record<string, { rxBytes: number; rxPackets: number; txBytes: number; txPackets: number }> = {};
      for (const line of text.split('\n')) {
        const match = line.match(/^\s*(\w+):\s+(.+)$/);
        if (!match) continue;
        const name = match[1];
        if (name === 'lo') continue;
        const values = match[2].trim().split(/\s+/).map(Number);
        interfaces[name] = {
          rxBytes: values[0] ?? 0,
          rxPackets: values[1] ?? 0,
          txBytes: values[8] ?? 0,
          txPackets: values[9] ?? 0,
        };
      }
      return interfaces;
    };

    const n1 = parseNetDev(first);
    const n2 = parseNetDev(second);
    const interfaces: Record<string, unknown>[] = [];

    for (const name of Object.keys(n2)) {
      const s1 = n1[name];
      const s2 = n2[name];
      if (!s1 || !s2) continue;

      interfaces.push({
        interface: name,
        rxBytesPerSec: s2.rxBytes - s1.rxBytes,
        txBytesPerSec: s2.txBytes - s1.txBytes,
        rxMbps: Math.round(((s2.rxBytes - s1.rxBytes) * 8) / 1_000_000 * 100) / 100,
        txMbps: Math.round(((s2.txBytes - s1.txBytes) * 8) / 1_000_000 * 100) / 100,
        rxPacketsPerSec: s2.rxPackets - s1.rxPackets,
        txPacketsPerSec: s2.txPackets - s1.txPackets,
      });
    }

    return { interfaces };
  }
}

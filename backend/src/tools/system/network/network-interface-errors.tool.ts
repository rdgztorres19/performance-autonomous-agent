import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class NetworkInterfaceErrorsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Network Errors by Interface',
        unit: 'count',
        arrayField: 'interfaces',
        labelField: 'interface',
        valueFields: [
          { field: 'rxErrs', label: 'RX Errs' },
          { field: 'rxDrop', label: 'RX Drop' },
          { field: 'txErrs', label: 'TX Errs' },
          { field: 'txDrop', label: 'TX Drop' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'network_interface_errors',
      description:
        'Collects network errors and drops per interface from /proc/net/dev (rx errs, rx drop, tx errs, tx drop). Equivalent to ip -s link but using only /proc.',
      category: ToolCategory.NETWORK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return 'cat /proc/net/dev';
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    // /proc/net/dev: interface | bytes packets errs drop fifo frame compressed multicast | bytes packets errs drop ...
    // RX: 0=bytes, 1=packets, 2=errs, 3=drop, 4=fifo, 5=frame, 6=compressed, 7=multicast
    // TX: 8=bytes, 9=packets, 10=errs, 11=drop, 12=fifo, 13=collisions, 14=carrier, 15=compressed
    const interfaces: Record<string, unknown>[] = [];

    for (const line of stdout.split('\n')) {
      const match = line.match(/^\s*(\w+):\s+(.+)$/);
      if (!match) continue;
      const iface = match[1];
      if (iface === 'lo') continue;

      const values = match[2].trim().split(/\s+/).map(Number);
      interfaces.push({
        interface: iface,
        rxBytes: values[0] ?? 0,
        rxPackets: values[1] ?? 0,
        rxErrs: values[2] ?? 0,
        rxDrop: values[3] ?? 0,
        txBytes: values[8] ?? 0,
        txPackets: values[9] ?? 0,
        txErrs: values[10] ?? 0,
        txDrop: values[11] ?? 0,
        totalErrs: (values[2] ?? 0) + (values[10] ?? 0),
        totalDrop: (values[3] ?? 0) + (values[11] ?? 0),
      });
    }

    const totalRxErrs = interfaces.reduce((s, i) => s + ((i.rxErrs as number) ?? 0), 0);
    const totalTxErrs = interfaces.reduce((s, i) => s + ((i.txErrs as number) ?? 0), 0);
    const totalRxDrop = interfaces.reduce((s, i) => s + ((i.rxDrop as number) ?? 0), 0);
    const totalTxDrop = interfaces.reduce((s, i) => s + ((i.txDrop as number) ?? 0), 0);

    return {
      interfaces,
      totals: {
        rxErrs: totalRxErrs,
        txErrs: totalTxErrs,
        rxDrop: totalRxDrop,
        txDrop: totalTxDrop,
      },
    };
  }
}

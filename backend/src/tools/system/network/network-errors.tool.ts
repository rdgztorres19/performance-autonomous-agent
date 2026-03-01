import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata, VisualizationSpec } from '../../../common/interfaces/index.js';

export class NetworkErrorsTool extends BaseTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{
        type: 'bar',
        title: 'Network Errors',
        unit: 'count',
        slices: [
          { label: 'Retransmits', field: 'retransmits' },
          { label: 'Attempt Fails', field: 'attemptFails' },
          { label: 'Estab Resets', field: 'estabResets' },
          { label: 'Listen Drops', field: 'listenDrops' },
          { label: 'Listen Overflows', field: 'listenOverflows' },
        ],
      }],
    };
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'network_errors',
      description:
        'Collects network error metrics: retransmissions, packet drops, TCP resets, connection counts from /proc/net/snmp and ss.',
      category: ToolCategory.NETWORK,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(): string {
    return [
      'cat /proc/net/snmp | grep -A1 "^Tcp:"',
      'echo "---SEP---"',
      'cat /proc/net/netstat | grep -A1 "^TcpExt:"',
      'echo "---SEP---"',
      'ss -s 2>/dev/null || netstat -s 2>/dev/null | head -20',
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const parts = stdout.split('---SEP---').map((s) => s.trim());

    const tcpSection = parts[0] ?? '';
    const tcpLines = tcpSection.split('\n').filter((l) => l.startsWith('Tcp:'));
    let retransmits = 0;
    let activeOpens = 0;
    let passiveOpens = 0;
    let attemptFails = 0;
    let estabResets = 0;
    let inSegs = 0;
    let outSegs = 0;

    if (tcpLines.length >= 2) {
      const headers = tcpLines[0].split(/\s+/);
      const values = tcpLines[1].split(/\s+/).map(Number);
      const idx = (name: string) => headers.indexOf(name);

      retransmits = values[idx('RetransSegs')] ?? 0;
      activeOpens = values[idx('ActiveOpens')] ?? 0;
      passiveOpens = values[idx('PassiveOpens')] ?? 0;
      attemptFails = values[idx('AttemptFails')] ?? 0;
      estabResets = values[idx('EstabResets')] ?? 0;
      inSegs = values[idx('InSegs')] ?? 0;
      outSegs = values[idx('OutSegs')] ?? 0;
    }

    const tcpExtSection = parts[1] ?? '';
    const extLines = tcpExtSection.split('\n').filter((l) => l.startsWith('TcpExt:'));
    let listenDrops = 0;
    let listenOverflows = 0;

    if (extLines.length >= 2) {
      const headers = extLines[0].split(/\s+/);
      const values = extLines[1].split(/\s+/).map(Number);
      const idx = (name: string) => headers.indexOf(name);
      listenDrops = values[idx('ListenDrops')] ?? 0;
      listenOverflows = values[idx('ListenOverflows')] ?? 0;
    }

    return {
      retransmits,
      retransmitRate: outSegs > 0 ? Math.round((retransmits / outSegs) * 10000) / 100 : 0,
      activeOpens,
      passiveOpens,
      attemptFails,
      estabResets,
      inSegments: inSegs,
      outSegments: outSegs,
      listenDrops,
      listenOverflows,
    };
  }
}

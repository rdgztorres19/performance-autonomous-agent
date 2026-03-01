import { BaseTool } from '../../base-tool.js';
import { ToolCategory, MetricLevel } from '../../../common/interfaces/index.js';
import type { ToolMetadata } from '../../../common/interfaces/index.js';

/**
 * Gathers per-process throughput metrics using OS-level commands:
 *   - Network bytes/packets in/out from /proc/<pid>/net/dev
 *   - Active connection count and rate from ss
 *   - Socket throughput estimation
 *   - I/O throughput from /proc/<pid>/io (read/write bytes)
 *
 * For accurate rate measurements, takes two snapshots with a 1-second
 * interval and computes the delta.
 */
export class ApplicationThroughputTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'application_throughput',
      description:
        'Collects per-process throughput metrics: network bytes/packets per second (RX/TX), active connection count and churn, I/O read/write bytes per second. Takes two 1-second-apart snapshots to compute rates. Covers requests/sec proxy (via connection count), transactions throughput (via I/O ops), and bandwidth usage.',
      category: ToolCategory.APPLICATION_THROUGHPUT,
      level: MetricLevel.APPLICATION,
      platform: ['linux'],
      parameters: [
        {
          name: 'pid',
          description: 'Process ID to measure throughput for',
          type: 'number',
          required: true,
        },
      ],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    const pid = Number(params['pid']);
    // Two snapshots 1 second apart for rate computation
    return [
      // Snapshot 1: network + I/O
      `cat /proc/${pid}/net/dev 2>/dev/null | tail -n +3`,
      'echo "---SNAP---"',
      `cat /proc/${pid}/io 2>/dev/null || echo "io_unavailable"`,
      'echo "---SNAP---"',
      `ss -tnp 2>/dev/null | grep "pid=${pid}," | wc -l`,
      'echo "---SNAP---"',
      // Wait 1 second
      'sleep 1',
      // Snapshot 2: network + I/O
      `cat /proc/${pid}/net/dev 2>/dev/null | tail -n +3`,
      'echo "---SNAP---"',
      `cat /proc/${pid}/io 2>/dev/null || echo "io_unavailable"`,
      'echo "---SNAP---"',
      `ss -tnp 2>/dev/null | grep "pid=${pid}," | wc -l`,
      'echo "---SNAP---"',
      // Connection states breakdown
      `ss -tnp 2>/dev/null | grep "pid=${pid}," | awk '{print $1}' | sort | uniq -c | sort -rn || echo "no_states"`,
    ].join(' && ');
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    const snaps = stdout.split('---SNAP---').map((s) => s.trim());
    if (snaps.length < 7) {
      return { error: 'Insufficient data collected', raw: stdout.substring(0, 500) };
    }

    const net1 = this.parseNetDev(snaps[0]);
    const io1 = this.parseIo(snaps[1]);
    const conns1 = parseInt(snaps[2], 10) || 0;

    const net2 = this.parseNetDev(snaps[3]);
    const io2 = this.parseIo(snaps[4]);
    const conns2 = parseInt(snaps[5], 10) || 0;

    const connStates = this.parseConnStates(snaps[6]);

    const rxBytesPerSec = net2.totalRxBytes - net1.totalRxBytes;
    const txBytesPerSec = net2.totalTxBytes - net1.totalTxBytes;
    const rxPacketsPerSec = net2.totalRxPackets - net1.totalRxPackets;
    const txPacketsPerSec = net2.totalTxPackets - net1.totalTxPackets;

    const readBytesPerSec = io2.readBytes - io1.readBytes;
    const writeBytesPerSec = io2.writeBytes - io1.writeBytes;
    const readOpsPerSec = io2.syscr - io1.syscr;
    const writeOpsPerSec = io2.syscw - io1.syscw;

    return {
      network: {
        rxBytesPerSec,
        txBytesPerSec,
        rxMbPerSec: Math.round((rxBytesPerSec / 1024 / 1024) * 100) / 100,
        txMbPerSec: Math.round((txBytesPerSec / 1024 / 1024) * 100) / 100,
        rxPacketsPerSec,
        txPacketsPerSec,
      },
      io: {
        readBytesPerSec,
        writeBytesPerSec,
        readMbPerSec: Math.round((readBytesPerSec / 1024 / 1024) * 100) / 100,
        writeMbPerSec: Math.round((writeBytesPerSec / 1024 / 1024) * 100) / 100,
        readOpsPerSec,
        writeOpsPerSec,
      },
      connections: {
        activeCount: conns2,
        connectionChurn: conns2 - conns1,
        states: connStates,
      },
      summary: {
        totalNetworkMbPerSec:
          Math.round(((rxBytesPerSec + txBytesPerSec) / 1024 / 1024) * 100) / 100,
        totalIoMbPerSec:
          Math.round(((readBytesPerSec + writeBytesPerSec) / 1024 / 1024) * 100) / 100,
        totalOpsPerSec: readOpsPerSec + writeOpsPerSec,
        isHighThroughput:
          rxBytesPerSec + txBytesPerSec > 10 * 1024 * 1024 ||
          readBytesPerSec + writeBytesPerSec > 50 * 1024 * 1024,
      },
    };
  }

  private parseNetDev(raw: string): {
    totalRxBytes: number;
    totalTxBytes: number;
    totalRxPackets: number;
    totalTxPackets: number;
  } {
    let totalRxBytes = 0;
    let totalTxBytes = 0;
    let totalRxPackets = 0;
    let totalTxPackets = 0;

    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.match(/^\s*(\S+):\s+(.*)/);
      if (!match) continue;
      const iface = match[1];
      if (iface === 'lo') continue; // skip loopback
      const cols = match[2].trim().split(/\s+/);
      totalRxBytes += parseInt(cols[0] ?? '0', 10);
      totalRxPackets += parseInt(cols[1] ?? '0', 10);
      totalTxBytes += parseInt(cols[8] ?? '0', 10);
      totalTxPackets += parseInt(cols[9] ?? '0', 10);
    }

    return { totalRxBytes, totalTxBytes, totalRxPackets, totalTxPackets };
  }

  private parseIo(raw: string): {
    readBytes: number;
    writeBytes: number;
    syscr: number;
    syscw: number;
  } {
    if (raw.includes('io_unavailable')) {
      return { readBytes: 0, writeBytes: 0, syscr: 0, syscw: 0 };
    }
    const vals: Record<string, number> = {};
    for (const line of raw.split('\n')) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (match) vals[match[1]] = parseInt(match[2], 10);
    }
    return {
      readBytes: vals['read_bytes'] ?? 0,
      writeBytes: vals['write_bytes'] ?? 0,
      syscr: vals['syscr'] ?? 0,
      syscw: vals['syscw'] ?? 0,
    };
  }

  private parseConnStates(raw: string): Record<string, number> {
    const states: Record<string, number> = {};
    if (raw.includes('no_states')) return states;
    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)/);
      if (match) states[match[2].trim()] = parseInt(match[1], 10);
    }
    return states;
  }
}

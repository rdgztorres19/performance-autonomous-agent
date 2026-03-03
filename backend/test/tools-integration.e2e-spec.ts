/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Integration tests for all performance tools.
 *
 * These tests run real commands against a Linux container via SSH
 * to verify that:
 *   1. Each command executes without errors (exit code 0 or graceful fallback)
 *   2. The stdout format matches what parseOutput expects
 *   3. The parsed result contains the expected metric fields
 *
 * Prerequisites:
 *   cd backend/test
 *   docker compose -f docker-compose.test.yml up -d
 *   # Wait ~10s for SSH to be ready
 *
 * Run:
 *   npm run test:e2e -- --testPathPattern=tools-integration
 */

import { SshConnection } from '../src/connections/impl/ssh.connection';
import type { Connection } from '../src/common/interfaces/connection.interface';

import { CpuUtilizationTool } from '../src/tools/system/cpu/cpu-utilization.tool';
import { LoadAverageTool } from '../src/tools/system/cpu/load-average.tool';
import { CpuSaturationTool } from '../src/tools/system/cpu/cpu-saturation.tool';
import { CpuSchedulingTool } from '../src/tools/system/cpu/cpu-scheduling.tool';
import { CpuPerCoreTool } from '../src/tools/system/cpu/cpu-per-core.tool';
import { CpuInterruptsTool } from '../src/tools/system/cpu/cpu-interrupts.tool';

import { MemoryUtilizationTool } from '../src/tools/system/memory/memory-utilization.tool';
import { MemoryPressureTool } from '../src/tools/system/memory/memory-pressure.tool';
import { OomKillsTool } from '../src/tools/system/memory/oom-kills.tool';

import { FileSystemTool } from '../src/tools/system/disk/filesystem.tool';
import { DiskThroughputTool } from '../src/tools/system/disk/disk-throughput.tool';
import { DiskSaturationTool } from '../src/tools/system/disk/disk-saturation.tool';

import { NetworkConnectionsTool } from '../src/tools/system/network/network-connections.tool';
import { NetworkErrorsTool } from '../src/tools/system/network/network-errors.tool';
import { NetworkThroughputTool } from '../src/tools/system/network/network-throughput.tool';
import { NetworkInterfaceErrorsTool } from '../src/tools/system/network/network-interface-errors.tool';

import { KernelMetricsTool } from '../src/tools/system/kernel/kernel-metrics.tool';
import { SystemLimitsTool } from '../src/tools/system/kernel/system-limits.tool';
import { VirtualizationMetricsTool } from '../src/tools/system/virtualization/virtualization-metrics.tool';

import { ProcessCpuTool } from '../src/tools/application/process/process-cpu.tool';
import { ProcessMemoryTool } from '../src/tools/application/process/process-memory.tool';
import { ProcessIoTool } from '../src/tools/application/process/process-io.tool';
import { ProcessThreadCpuTool } from '../src/tools/application/process/process-thread-cpu.tool';
import { ProcessCpuAffinityTool } from '../src/tools/application/process/process-cpu-affinity.tool';
import { ProcessThreadMemoryTool } from '../src/tools/application/process/process-thread-memory.tool';
import { ProcessOpenFilesTool } from '../src/tools/application/process/process-open-files.tool';

import { ThreadingMetricsTool } from '../src/tools/application/threading/threading-metrics.tool';
import { RuntimeSpecificTool } from '../src/tools/application/runtime/runtime-specific.tool';
import { ApplicationLatencyTool } from '../src/tools/application/latency/application-latency.tool';
import { ApplicationErrorsTool } from '../src/tools/application/errors/application-errors.tool';
import { ApplicationThroughputTool } from '../src/tools/application/throughput/application-throughput.tool';

const SSH_CONFIG = {
  host: process.env['SSH_TEST_HOST'] ?? '127.0.0.1',
  port: parseInt(process.env['SSH_TEST_PORT'] ?? '2222', 10),
  username: process.env['SSH_TEST_USER'] ?? 'testuser',
  password: process.env['SSH_TEST_PASS'] ?? 'testpass',
};

let connection: Connection;
let pid1: number;

beforeAll(async () => {
  connection = new SshConnection(SSH_CONFIG);
  await connection.connect();

  const result = await connection.execute('echo 1');
  if (result.exitCode !== 0) {
    throw new Error(`SSH connectivity check failed: ${result.stderr}`);
  }

  // PID 1 always exists in any Linux system
  pid1 = 1;
});

afterAll(async () => {
  await connection.disconnect();
});

// ──────────────────────────────────────────────
// Helper: run a tool and assert basic success
// ──────────────────────────────────────────────

async function runToolAndAssert(
  ToolClass: new (conn: Connection) => any,
  params: Record<string, unknown> = {},
  expectations?: {
    requiredFields?: string[];
    allowError?: boolean;
  },
) {
  const tool = new ToolClass(connection);
  const result = await tool.execute(params);

  if (!expectations?.allowError) {
    if (!result.success) {
      console.error(`Tool ${result.toolName} FAILED:`, result.error);
      console.error('Raw output:', result.rawOutput?.stdout?.substring(0, 500));
      console.error('Raw stderr:', result.rawOutput?.stderr?.substring(0, 500));
    }
    expect(result.success).toBe(true);
  }

  expect(result.toolName).toBeDefined();
  expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

  if (expectations?.requiredFields) {
    for (const field of expectations.requiredFields) {
      expect(result.data).toHaveProperty(field);
    }
  }

  return result;
}

// ──────────────────────────────────────────────
// System-Level Tools
// ──────────────────────────────────────────────

describe('System Tools (via SSH)', () => {
  describe('CPU', () => {
    it('cpu_utilization: should collect CPU percentages', async () => {
      await runToolAndAssert(
        CpuUtilizationTool,
        { sampleIntervalMs: 500 },
        {
          requiredFields: ['userPercent', 'systemPercent', 'idlePercent', 'totalUsedPercent'],
        },
      );
    }, 15000);

    it('load_average: should collect load and CPU count', async () => {
      await runToolAndAssert(
        LoadAverageTool,
        {},
        {
          requiredFields: ['load1m', 'load5m', 'load15m', 'cpuCount'],
        },
      );
    });

    it('cpu_saturation: should collect context switches and run queue', async () => {
      await runToolAndAssert(
        CpuSaturationTool,
        { sampleIntervalMs: 500 },
        {
          requiredFields: ['contextSwitchesPerSec', 'runQueueLength'],
        },
      );
    }, 15000);

    it('cpu_scheduling: should collect scheduling stats', async () => {
      const result = await runToolAndAssert(
        CpuSchedulingTool,
        {},
        {
          requiredFields: ['cpuCount'],
        },
      );
      expect(typeof result.data['schedstatAvailable']).toBe('boolean');
    });

    it('cpu_per_core: should collect CPU % per core', async () => {
      const result = await runToolAndAssert(
        CpuPerCoreTool,
        { sampleIntervalMs: 500 },
        {
          requiredFields: ['cores', 'coreCount'],
        },
      );
      expect(Array.isArray(result.data['cores'])).toBe(true);
    }, 15000);

    it('cpu_interrupts: should collect interrupts and softirqs', async () => {
      await runToolAndAssert(
        CpuInterruptsTool,
        {},
        {
          requiredFields: ['perCpu', 'softirqByType'],
        },
      );
    });
  });

  describe('Memory', () => {
    it('memory_utilization: should collect memory stats', async () => {
      await runToolAndAssert(
        MemoryUtilizationTool,
        {},
        {
          requiredFields: ['totalMb', 'usedMb', 'freeMb', 'usedPercent'],
        },
      );
    });

    it('memory_pressure: should collect vmstat pressure metrics', async () => {
      await runToolAndAssert(
        MemoryPressureTool,
        {},
        {
          requiredFields: ['pageFaultsMinor', 'swapIn', 'swapOut'],
        },
      );
    });

    it('oom_kills: should collect OOM events from vmstat and dmesg', async () => {
      await runToolAndAssert(
        OomKillsTool,
        {},
        {
          requiredFields: ['oomKillsFromVmstat', 'oomEventsCount'],
        },
      );
    });
  });

  describe('Disk', () => {
    it('filesystem_usage: should list mounted filesystems', async () => {
      const result = await runToolAndAssert(
        FileSystemTool,
        {},
        {
          requiredFields: ['filesystems'],
        },
      );
      expect(Array.isArray(result.data['filesystems'])).toBe(true);
    });

    it('disk_throughput: should collect disk I/O rates', async () => {
      const result = await runToolAndAssert(
        DiskThroughputTool,
        {},
        {
          allowError: true, // container may not have block devices
        },
      );
      if (result.success) {
        expect(Array.isArray(result.data['devices'])).toBe(true);
      }
    }, 15000);

    it('disk_saturation: should collect disk utilization', async () => {
      const result = await runToolAndAssert(
        DiskSaturationTool,
        {},
        {
          allowError: true, // container may not have block devices
        },
      );
      if (result.success && !result.data['error']) {
        expect(Array.isArray(result.data['devices'])).toBe(true);
      }
    }, 15000);
  });

  describe('Network', () => {
    it('network_connections: should list TCP states', async () => {
      const result = await runToolAndAssert(
        NetworkConnectionsTool,
        {},
        {
          requiredFields: ['totalConnections', 'states'],
        },
      );
      expect(typeof result.data['totalConnections']).toBe('number');
    });

    it('network_errors: should collect TCP error counters', async () => {
      await runToolAndAssert(
        NetworkErrorsTool,
        {},
        {
          requiredFields: ['retransmits', 'activeOpens'],
        },
      );
    });

    it('network_throughput: should measure per-interface throughput', async () => {
      const result = await runToolAndAssert(
        NetworkThroughputTool,
        {},
        {
          requiredFields: ['interfaces'],
        },
      );
      expect(Array.isArray(result.data['interfaces'])).toBe(true);
    }, 15000);

    it('network_interface_errors: should collect errors/drops per interface', async () => {
      await runToolAndAssert(
        NetworkInterfaceErrorsTool,
        {},
        {
          requiredFields: ['interfaces', 'totals'],
        },
      );
    });
  });

  describe('Kernel', () => {
    it('kernel_metrics: should collect kernel version and FD usage', async () => {
      await runToolAndAssert(
        KernelMetricsTool,
        {},
        {
          requiredFields: [
            'kernelVersion',
            'openFileDescriptors',
            'maxFileDescriptors',
            'uptimeSeconds',
            'somaxconn',
          ],
        },
      );
    });

    it('system_limits: should collect kernel and process limits', async () => {
      await runToolAndAssert(
        SystemLimitsTool,
        {},
        {
          requiredFields: ['kernel', 'systemFds'],
        },
      );
    });
  });

  describe('Virtualization', () => {
    it('virtualization_metrics: should detect container environment', async () => {
      const result = await runToolAndAssert(
        VirtualizationMetricsTool,
        {},
        {
          requiredFields: ['stealPercent', 'isContainer'],
        },
      );
      expect(typeof result.data['stealPercent']).toBe('number');
    });
  });
});

// ──────────────────────────────────────────────
// Application-Level Tools (using PID 1)
// ──────────────────────────────────────────────

describe('Application Tools (via SSH, PID 1)', () => {
  describe('Process', () => {
    it('process_cpu: should list top CPU processes', async () => {
      const result = await runToolAndAssert(
        ProcessCpuTool,
        {},
        {
          requiredFields: ['topProcesses'],
        },
      );
      expect(Array.isArray(result.data['topProcesses'])).toBe(true);
    });

    it('process_cpu: should inspect specific PID', async () => {
      await runToolAndAssert(
        ProcessCpuTool,
        { pid: pid1 },
        {
          requiredFields: ['pid', 'cpuPercent'],
        },
      );
    });

    it('process_memory: should list top memory processes', async () => {
      const result = await runToolAndAssert(
        ProcessMemoryTool,
        {},
        {
          requiredFields: ['topProcesses'],
        },
      );
      expect(Array.isArray(result.data['topProcesses'])).toBe(true);
    });

    it('process_memory: should inspect specific PID', async () => {
      await runToolAndAssert(
        ProcessMemoryTool,
        { pid: pid1 },
        {
          requiredFields: ['name', 'vmRssKb'],
        },
      );
    });

    it('process_thread_cpu: should collect CPU per thread', async () => {
      await runToolAndAssert(ProcessThreadCpuTool, { pid: pid1, sampleIntervalMs: 300 }, {
        requiredFields: ['threads', 'totalThreads'],
      });
    }, 10000);

    it('process_cpu_affinity: should return affinity mask', async () => {
      const result = await runToolAndAssert(ProcessCpuAffinityTool, { pid: pid1 }, {
        allowError: true,
      });
      if (result.success && !result.data['error']) {
        expect(result.data).toHaveProperty('affinityMask');
        expect(result.data).toHaveProperty('cpus');
      }
    });

    it('process_thread_memory: should collect memory per thread', async () => {
      await runToolAndAssert(ProcessThreadMemoryTool, { pid: pid1 }, {
        requiredFields: ['threads', 'totalVmRssKb'],
      });
    });

    it('process_open_files: should list open FDs', async () => {
      const result = await runToolAndAssert(ProcessOpenFilesTool, { pid: pid1 }, {
        allowError: true,
      });
      if (result.success && !result.data['error']) {
        expect(result.data).toHaveProperty('openFiles');
        expect(result.data).toHaveProperty('totalCount');
      }
    });

    it('process_io: should read I/O stats for PID (or report permission error)', async () => {
      const result = await runToolAndAssert(
        ProcessIoTool,
        { pid: pid1 },
        {
          allowError: true,
        },
      );
      if (result.success && !result.data['error']) {
        expect(result.data).toHaveProperty('readBytes');
      } else {
        expect(result.data['error'] ?? result.error).toBeDefined();
      }
    });
  });

  describe('Threading', () => {
    it('threading_metrics: should count threads for PID', async () => {
      await runToolAndAssert(
        ThreadingMetricsTool,
        { pid: pid1 },
        {
          requiredFields: ['threadCount', 'states'],
        },
      );
    });
  });

  describe('Runtime', () => {
    it('runtime_specific: should detect runtime type for PID', async () => {
      await runToolAndAssert(
        RuntimeSpecificTool,
        { pid: pid1 },
        {
          requiredFields: ['runtime', 'process'],
        },
      );
    });
  });

  describe('Latency', () => {
    it('application_latency: should collect latency indicators', async () => {
      await runToolAndAssert(
        ApplicationLatencyTool,
        { pid: pid1 },
        {
          requiredFields: ['tcp', 'socketQueues', 'summary'],
        },
      );
    });
  });

  describe('Errors', () => {
    it('application_errors (system-wide): should collect error indicators', async () => {
      await runToolAndAssert(
        ApplicationErrorsTool,
        {},
        {
          requiredFields: ['tcpStats', 'summary'],
        },
      );
    });

    it('application_errors (per-PID): should collect per-process errors', async () => {
      const result = await runToolAndAssert(
        ApplicationErrorsTool,
        { pid: pid1 },
        {
          requiredFields: ['tcpErrors', 'fileDescriptors', 'summary'],
        },
      );
      expect(result.data['summary']).toHaveProperty('errorIndicators');
    });
  });

  describe('Throughput', () => {
    it('application_throughput: should measure throughput for PID', async () => {
      await runToolAndAssert(
        ApplicationThroughputTool,
        { pid: pid1 },
        {
          requiredFields: ['network', 'io', 'connections', 'summary'],
        },
      );
    }, 15000);
  });
});

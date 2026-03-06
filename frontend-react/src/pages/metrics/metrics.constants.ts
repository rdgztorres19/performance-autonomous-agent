/**
 * Metrics Center constants — ToolCategory → Lens + Tab mapping.
 * Single source of truth for navigation structure.
 */
import type { MetricLens, MetricCategory } from '@/types/metrics';

export const SYSTEM_CATEGORIES: MetricCategory[] = [
  'cpu',
  'memory',
  'disk',
  'network',
  'kernel',
  'file_system',
  'virtualization',
];

export const APPLICATION_CATEGORIES: MetricCategory[] = [
  'application_latency',
  'application_throughput',
  'application_errors',
  'application_threading',
  'application_cpu',
  'application_memory',
  'application_io',
  'runtime_specific',
];

/** Maps ToolCategory (from backend) to lens and tab */
export const CATEGORY_TO_LENS: Record<string, MetricLens> = {
  cpu: 'system',
  memory: 'system',
  disk: 'system',
  network: 'system',
  kernel: 'system',
  file_system: 'system',
  virtualization: 'system',
  application_latency: 'application',
  application_throughput: 'application',
  application_errors: 'application',
  application_threading: 'application',
  application_cpu: 'application',
  application_memory: 'application',
  application_io: 'application',
  runtime_specific: 'application',
};

/** Maps tool name (from backend) to MetricCategory — used when metadata has no category */
export const TOOL_TO_CATEGORY: Record<string, MetricCategory> = {
  load_average: 'cpu',
  cpu_utilization: 'cpu',
  cpu_per_core: 'cpu',
  cpu_saturation: 'cpu',
  cpu_interrupts: 'cpu',
  cpu_scheduling: 'cpu',
  memory_utilization: 'memory',
  memory_pressure: 'memory',
  oom_kills: 'memory',
  disk_saturation: 'disk',
  disk_throughput: 'disk',
  filesystem: 'file_system',
  network_connections: 'network',
  network_throughput: 'network',
  network_errors: 'network',
  network_interface_errors: 'network',
  kernel_metrics: 'kernel',
  system_limits: 'kernel',
  virtualization_metrics: 'virtualization',
  application_latency: 'application_latency',
  application_throughput: 'application_throughput',
  application_errors: 'application_errors',
  threading_metrics: 'application_threading',
  process_thread_cpu: 'application_threading',
  process_thread_memory: 'application_threading',
  process_cpu: 'application_cpu',
  process_cpu_affinity: 'application_cpu',
  process_memory: 'application_memory',
  process_io: 'application_io',
  process_open_files: 'application_io',
  runtime_specific: 'runtime_specific',
};

/** Human-readable labels for categories */
export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  disk: 'Disk',
  network: 'Network',
  kernel: 'Kernel',
  file_system: 'File System',
  virtualization: 'Virtualization',
  application_latency: 'Latency',
  application_throughput: 'Throughput',
  application_errors: 'Errors',
  application_threading: 'Threading',
  application_cpu: 'CPU',
  application_memory: 'Memory',
  application_io: 'I/O',
  runtime_specific: 'Runtime',
};

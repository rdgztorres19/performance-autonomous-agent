/**
 * Metrics Center types — aligned with backend ToolCategory / MetricLevel.
 * Used for lens selection and category mapping.
 */
export type MetricLens = 'system' | 'application';

/** Category IDs for UI tabs (matches backend ToolCategory) */
export type MetricCategory =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network'
  | 'kernel'
  | 'file_system'
  | 'virtualization'
  | 'application_latency'
  | 'application_throughput'
  | 'application_errors'
  | 'application_threading'
  | 'application_cpu'
  | 'application_memory'
  | 'application_io'
  | 'runtime_specific';

export type MetricView = 'live' | 'historical';

export type TimeRangePreset = '1h' | '24h' | '7d';

/** Threshold state for metric value classification */
export type ThresholdState = 'low' | 'medium' | 'high' | 'unknown';

/** Tool execution snapshot with visualization data */
export interface MetricSnapshot {
  toolName: string;
  category: string;
  timestamp: string;
  data: Record<string, unknown>;
  visualization: import('./visualization').VisualizationSpec;
}

import type { CommandResult } from './connection.interface.js';

export enum ToolCategory {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  KERNEL = 'kernel',
  VIRTUALIZATION = 'virtualization',
  FILE_SYSTEM = 'file_system',
  APPLICATION_LATENCY = 'application_latency',
  APPLICATION_THROUGHPUT = 'application_throughput',
  APPLICATION_ERRORS = 'application_errors',
  APPLICATION_THREADING = 'application_threading',
  APPLICATION_CPU = 'application_cpu',
  APPLICATION_MEMORY = 'application_memory',
  APPLICATION_IO = 'application_io',
  RUNTIME_SPECIFIC = 'runtime_specific',
}

export enum MetricLevel {
  SYSTEM = 'system',
  APPLICATION = 'application',
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  level: MetricLevel;
  platform: string[];
  parameters?: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface ToolResult {
  success: boolean;
  toolName: string;
  category: ToolCategory;
  data: Record<string, unknown>;
  rawOutput?: CommandResult;
  error?: string;
  executionTimeMs: number;
}

export interface PerformanceTool {
  getMetadata(): ToolMetadata;
  getVisualization(): VisualizationSpec | undefined;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

export type ChartType = 'donut' | 'bar' | 'horizontalBar' | 'radialBar' | 'area';

export interface ChartSlice {
  label: string;
  field: string;
  color?: string;
}

export interface ChartDefinition {
  type: ChartType;
  title: string;
  unit?: string;
  slices?: ChartSlice[];
  arrayField?: string;
  labelField?: string;
  valueField?: string;
  valueFields?: { field: string; label: string }[];
  gaugeField?: string;
  gaugeMax?: number;
  dynamicMapField?: string;
}

export interface VisualizationSpec {
  charts: ChartDefinition[];
}

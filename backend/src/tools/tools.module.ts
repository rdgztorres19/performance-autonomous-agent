import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool-registry.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { AgentToolRegistry } from './agent/agent-tool-registry.js';
import { ReportProblemTool } from './agent/report-problem.tool.js';
import { LogReasoningTool } from './agent/log-reasoning.tool.js';
import { RequestUserInfoTool } from './agent/request-user-info.tool.js';
import type { Connection } from '../common/interfaces/index.js';
import { BaseTool } from './base-tool.js';

import {
  CpuUtilizationTool,
  LoadAverageTool,
  CpuSaturationTool,
  CpuSchedulingTool,
} from './system/cpu/index.js';
import { MemoryUtilizationTool, MemoryPressureTool } from './system/memory/index.js';
import { DiskThroughputTool, DiskSaturationTool, FileSystemTool } from './system/disk/index.js';
import {
  NetworkThroughputTool,
  NetworkErrorsTool,
  NetworkConnectionsTool,
} from './system/network/index.js';
import { KernelMetricsTool } from './system/kernel/index.js';
import { VirtualizationMetricsTool } from './system/virtualization/index.js';
import { ProcessCpuTool, ProcessMemoryTool, ProcessIoTool } from './application/process/index.js';
import { ThreadingMetricsTool } from './application/threading/index.js';
import { ApplicationLatencyTool } from './application/latency/index.js';
import { ApplicationThroughputTool } from './application/throughput/index.js';
import { ApplicationErrorsTool } from './application/errors/index.js';
import { RuntimeSpecificTool } from './application/runtime/index.js';

export const PERFORMANCE_TOOL_CLASSES: (new (conn: Connection) => BaseTool)[] = [
  // System tools
  CpuUtilizationTool,
  LoadAverageTool,
  CpuSaturationTool,
  CpuSchedulingTool,
  MemoryUtilizationTool,
  MemoryPressureTool,
  DiskThroughputTool,
  DiskSaturationTool,
  FileSystemTool,
  NetworkThroughputTool,
  NetworkErrorsTool,
  NetworkConnectionsTool,
  KernelMetricsTool,
  VirtualizationMetricsTool,
  // Application tools
  ProcessCpuTool,
  ProcessMemoryTool,
  ProcessIoTool,
  ThreadingMetricsTool,
  ApplicationLatencyTool,
  ApplicationThroughputTool,
  ApplicationErrorsTool,
  RuntimeSpecificTool,
];

const agentToolRegistryFactory = {
  provide: AgentToolRegistry,
  useFactory: () => {
    const registry = new AgentToolRegistry();
    registry.register(new ReportProblemTool());
    registry.register(new LogReasoningTool());
    registry.register(new RequestUserInfoTool());
    return registry;
  },
};

export const PERFORMANCE_TOOL_CLASSES_TOKEN = 'PERFORMANCE_TOOL_CLASSES';

@Module({
  imports: [ConnectionsModule],
  providers: [
    ToolRegistry,
    agentToolRegistryFactory,
    {
      provide: PERFORMANCE_TOOL_CLASSES_TOKEN,
      useValue: PERFORMANCE_TOOL_CLASSES,
    },
  ],
  exports: [ToolRegistry, AgentToolRegistry, PERFORMANCE_TOOL_CLASSES_TOKEN],
})
export class ToolsModule {}

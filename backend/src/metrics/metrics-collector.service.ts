import { Injectable, Inject } from '@nestjs/common';
import type { Connection } from '../common/interfaces/index.js';
import type { VisualizationSpec } from '../common/interfaces/index.js';
import { MetricLevel } from '../common/interfaces/index.js';
import { ConnectionFactory } from '../connections/connection.factory.js';
import { ConfigurationService } from '../config/configuration.service.js';
import { PERFORMANCE_TOOL_CLASSES_TOKEN } from '../tools/tools.module.js';
import type { BaseTool } from '../tools/base-tool.js';

export interface MetricSnapshotDto {
  toolName: string;
  category: string;
  data: Record<string, unknown>;
  visualization: VisualizationSpec;
  executionTimeMs: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpuPercent: number;
  memPercent: number;
  user: string;
}

@Injectable()
export class MetricsCollectorService {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly connectionFactory: ConnectionFactory,
    @Inject(PERFORMANCE_TOOL_CLASSES_TOKEN)
    private readonly performanceToolClasses: (new (conn: Connection) => BaseTool)[],
  ) {}

  async collect(configurationId: string, options?: { targetPid?: number }): Promise<MetricSnapshotDto[]> {
    const config = await this.configService.findById(configurationId);
    const connection = this.connectionFactory.create({
      type: config.connectionType as 'local' | 'ssh',
      ssh: config.sshHost
        ? {
            host: config.sshHost,
            port: config.sshPort ?? 22,
            username: config.sshUsername ?? '',
            password: config.sshPassword,
            privateKey: config.sshPrivateKey,
          }
        : undefined,
    });

    try {
      await connection.connect();

      const tools = this.performanceToolClasses.map((C) => new C(connection));
      const metricsTools = tools.filter((t) => {
        const viz = t.getVisualization();
        if (!viz) return false;
        const meta = t.getMetadata();
        if (meta.level === MetricLevel.APPLICATION) {
          return options?.targetPid != null;
        }
        return true;
      });

      const results: MetricSnapshotDto[] = [];
      const params = options?.targetPid != null ? { pid: options.targetPid } : {};

      for (const tool of metricsTools) {
        const viz = tool.getVisualization();
        if (!viz) continue;
        try {
          const meta = tool.getMetadata();
          if (meta.level === MetricLevel.APPLICATION && !options?.targetPid) continue;

          const result = await tool.execute(params);
          if (result.success && result.data && Object.keys(result.data).length > 0) {
            results.push({
              toolName: result.toolName,
              category: result.category,
              data: result.data,
              visualization: viz,
              executionTimeMs: result.executionTimeMs,
            });
          }
        } catch {
          /* skip failed tools */
        }
      }

      return results;
    } finally {
      await connection.disconnect();
    }
  }

  async listProcesses(configurationId: string): Promise<ProcessInfo[]> {
    const config = await this.configService.findById(configurationId);
    const connection = this.connectionFactory.create({
      type: config.connectionType as 'local' | 'ssh',
      ssh: config.sshHost
        ? {
            host: config.sshHost,
            port: config.sshPort ?? 22,
            username: config.sshUsername ?? '',
            password: config.sshPassword,
            privateKey: config.sshPrivateKey,
          }
        : undefined,
    });

    try {
      await connection.connect();
      // ps output: PID, %CPU, %MEM, USER, COMM, ARGS (truncated)
      const result = await connection.execute(
        "ps aux --sort=-%cpu 2>/dev/null | awk 'NR>1 && $3+0>=0 {printf \"%s|%s|%s|%s|%s\\n\",$2,$3,$4,$1,$11}' | head -50",
      );

      const processes: ProcessInfo[] = [];
      for (const line of result.stdout.split('\n')) {
        const parts = line.trim().split('|');
        if (parts.length < 5) continue;
        const pid = parseInt(parts[0], 10);
        if (isNaN(pid) || pid <= 0) continue;
        processes.push({
          pid,
          cpuPercent: parseFloat(parts[1]) || 0,
          memPercent: parseFloat(parts[2]) || 0,
          user: parts[3],
          name: parts[4].split('/').pop() || parts[4],
          command: parts[4],
        });
      }

      return processes;
    } finally {
      await connection.disconnect();
    }
  }
}

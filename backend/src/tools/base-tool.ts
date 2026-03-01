import type {
  Connection,
  PerformanceTool,
  ToolMetadata,
  ToolResult,
  ToolCategory,
  VisualizationSpec,
} from '../common/interfaces/index.js';

export abstract class BaseTool implements PerformanceTool {
  constructor(protected readonly connection: Connection) {}

  abstract getMetadata(): ToolMetadata;

  getVisualization(): VisualizationSpec | undefined {
    return undefined;
  }

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const metadata = this.getMetadata();
    const startTime = Date.now();

    try {
      const command = this.buildCommand(params);
      const rawOutput = await this.connection.execute(command);
      const data = this.parseOutput(rawOutput.stdout, rawOutput.stderr);

      return {
        success: true,
        toolName: metadata.name,
        category: metadata.category,
        data,
        rawOutput,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        toolName: metadata.name,
        category: metadata.category,
        data: {},
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  protected abstract buildCommand(params: Record<string, unknown>): string;
  protected abstract parseOutput(stdout: string, stderr: string): Record<string, unknown>;
}

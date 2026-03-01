import { BaseTool } from '../base-tool';
import { ToolCategory, MetricLevel } from '../../common/interfaces';
import type { ToolMetadata, ToolResult, VisualizationSpec } from '../../common/interfaces';
import { createMockConnection } from './mock-connection';

class ConcreteTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'test_tool',
      description: 'A test tool',
      category: ToolCategory.CPU,
      level: MetricLevel.SYSTEM,
      platform: ['linux'],
    };
  }

  protected buildCommand(params: Record<string, unknown>): string {
    return `echo ${params['msg'] ?? 'hello'}`;
  }

  protected parseOutput(stdout: string): Record<string, unknown> {
    return { value: stdout.trim() };
  }
}

class ToolWithVisualization extends ConcreteTool {
  override getVisualization(): VisualizationSpec {
    return {
      charts: [{ type: 'bar', title: 'Test', unit: '%', slices: [] }],
    };
  }
}

describe('BaseTool', () => {
  it('should return metadata', () => {
    const tool = new ConcreteTool(createMockConnection());
    const meta = tool.getMetadata();
    expect(meta.name).toBe('test_tool');
    expect(meta.category).toBe(ToolCategory.CPU);
  });

  it('should return undefined visualization by default', () => {
    const tool = new ConcreteTool(createMockConnection());
    expect(tool.getVisualization()).toBeUndefined();
  });

  it('should allow visualization override', () => {
    const tool = new ToolWithVisualization(createMockConnection());
    const viz = tool.getVisualization();
    expect(viz).toBeDefined();
    expect(viz!.charts[0].type).toBe('bar');
  });

  it('should execute successfully and parse output', async () => {
    const conn = createMockConnection('hello world\n');
    const tool = new ConcreteTool(conn);
    const result: ToolResult = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.toolName).toBe('test_tool');
    expect(result.category).toBe(ToolCategory.CPU);
    expect(result.data).toEqual({ value: 'hello world' });
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(conn.execute).toHaveBeenCalled();
  });

  it('should handle connection errors gracefully', async () => {
    const conn = createMockConnection();
    (conn.execute as jest.Mock).mockRejectedValue(new Error('Connection refused'));
    const tool = new ConcreteTool(conn);
    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection refused');
    expect(result.data).toEqual({});
  });

  it('should handle non-Error throws', async () => {
    const conn = createMockConnection();
    (conn.execute as jest.Mock).mockRejectedValue('string error');
    const tool = new ConcreteTool(conn);
    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('should pass params to buildCommand', async () => {
    const conn = createMockConnection('test\n');
    const tool = new ConcreteTool(conn);
    await tool.execute({ msg: 'world' });

    expect(conn.execute).toHaveBeenCalledWith('echo world');
  });
});

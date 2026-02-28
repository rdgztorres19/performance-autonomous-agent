import { Injectable } from '@nestjs/common';
import type {
  PerformanceTool,
  ToolMetadata,
  ToolCategory,
  MetricLevel,
} from '../common/interfaces/index.js';

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, PerformanceTool>();

  register(tool: PerformanceTool): void {
    const metadata = tool.getMetadata();
    this.tools.set(metadata.name, tool);
  }

  get(name: string): PerformanceTool | undefined {
    return this.tools.get(name);
  }

  getAll(): PerformanceTool[] {
    return Array.from(this.tools.values());
  }

  getAllMetadata(): ToolMetadata[] {
    return this.getAll().map((tool) => tool.getMetadata());
  }

  getByCategory(category: ToolCategory): PerformanceTool[] {
    return this.getAll().filter((tool) => tool.getMetadata().category === category);
  }

  getByLevel(level: MetricLevel): PerformanceTool[] {
    return this.getAll().filter((tool) => tool.getMetadata().level === level);
  }

  getByPlatform(platform: string): PerformanceTool[] {
    return this.getAll().filter((tool) => tool.getMetadata().platform.includes(platform));
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}

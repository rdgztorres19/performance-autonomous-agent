import { Injectable } from '@nestjs/common';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { BaseAgentTool } from './base-agent-tool.js';
import type { AgentContext, AgentToolMetadata } from './base-agent-tool.js';

@Injectable()
export class AgentToolRegistry {
  private readonly tools = new Map<string, BaseAgentTool>();

  register(tool: BaseAgentTool): void {
    const metadata = tool.getMetadata();
    this.tools.set(metadata.name, tool);
  }

  get(name: string): BaseAgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): BaseAgentTool[] {
    return Array.from(this.tools.values());
  }

  getAllMetadata(): AgentToolMetadata[] {
    return this.getAll().map((tool) => tool.getMetadata());
  }

  toLangChainTools(context: AgentContext): DynamicStructuredTool[] {
    return this.getAll().map((tool) => tool.toLangChainTool(context));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

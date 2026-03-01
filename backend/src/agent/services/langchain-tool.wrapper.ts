import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type {
  PerformanceTool,
  ToolMetadata,
  ToolParameter,
} from '../../common/interfaces/index.js';
import type { TimelineService } from './timeline.service.js';

export interface ToolWrapperContext {
  sessionId: string;
  timelineService: TimelineService;
}

function buildZodSchema(parameters?: ToolParameter[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (!parameters || parameters.length === 0) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of parameters) {
    let field: z.ZodTypeAny;
    switch (param.type) {
      case 'number':
        field = z.number().describe(param.description);
        break;
      case 'boolean':
        field = z.boolean().describe(param.description);
        break;
      default:
        field = z.string().describe(param.description);
    }

    if (!param.required) {
      field = field.optional();
    }

    shape[param.name] = field;
  }

  return z.object(shape);
}

export function wrapToolForLangChain(
  tool: PerformanceTool,
  ctx?: ToolWrapperContext,
): DynamicStructuredTool {
  const metadata: ToolMetadata = tool.getMetadata();
  const schema = buildZodSchema(metadata.parameters);

  return new DynamicStructuredTool({
    name: metadata.name,
    description: metadata.description,
    schema,
    func: async (input: Record<string, unknown>) => {
      const result = await tool.execute(input);
      if (ctx) {
        await ctx.timelineService.logToolExecution(
          ctx.sessionId,
          metadata.name,
          metadata.description,
          {
            input,
            output: result.data,
            visualization: tool.getVisualization(),
          },
        );
      }
      return JSON.stringify(result);
    },
  });
}

export function wrapAllToolsForLangChain(
  tools: PerformanceTool[],
  ctx?: ToolWrapperContext,
): DynamicStructuredTool[] {
  return tools.map((t) => wrapToolForLangChain(t, ctx));
}

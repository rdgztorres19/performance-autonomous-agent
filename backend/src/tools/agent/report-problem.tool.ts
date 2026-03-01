import { z } from 'zod';
import { BaseAgentTool } from './base-agent-tool.js';
import type { AgentContext, AgentToolMetadata } from './base-agent-tool.js';
import { ProblemCategory, ProblemSeverity } from '../../database/entities/index.js';

const CATEGORY_VALUES = [
  'cpu',
  'memory',
  'disk',
  'network',
  'kernel',
  'virtualization',
  'application',
  'file_system',
  'other',
] as const;

const SEVERITY_VALUES = ['critical', 'warning', 'info'] as const;

export class ReportProblemTool extends BaseAgentTool {
  getMetadata(): AgentToolMetadata {
    return {
      name: 'report_problem',
      description:
        'Report a detected performance problem. Use this when you identify a performance issue based on collected metrics.',
    };
  }

  protected buildSchema() {
    return z.object({
      category: z.enum(CATEGORY_VALUES).describe('Problem category'),
      severity: z.enum(SEVERITY_VALUES).describe('Problem severity'),
      title: z.string().describe('Brief problem title'),
      description: z.string().describe('Problem description'),
      explanation: z.string().describe('Why this is a problem'),
      metrics: z.string().describe('JSON string of relevant metrics'),
      recommendations: z.string().describe('Comma-separated list of recommendations'),
    });
  }

  protected async execute(input: Record<string, unknown>, context: AgentContext): Promise<string> {
    const category = input['category'] as string;
    const severity = input['severity'] as string;
    const title = input['title'] as string;
    const description = input['description'] as string;
    const explanation = input['explanation'] as string;
    const metricsRaw = input['metrics'] as string;
    const recommendationsRaw = input['recommendations'] as string;

    let metricsObj: Record<string, unknown> = {};
    try {
      metricsObj = JSON.parse(metricsRaw) as Record<string, unknown>;
    } catch {
      metricsObj = { raw: metricsRaw };
    }

    const report = await context.reportService.createReport({
      sessionId: context.sessionId,
      category: category as ProblemCategory,
      severity: severity as ProblemSeverity,
      title,
      description,
      explanation,
      metrics: metricsObj,
      recommendations: recommendationsRaw.split(',').map((r) => r.trim()),
    });

    await context.timelineService.logProblemDetected(
      context.sessionId,
      `[${severity.toUpperCase()}] ${title}`,
      { reportId: report.id, category, severity },
    );

    return JSON.stringify({ success: true, reportId: report.id });
  }
}

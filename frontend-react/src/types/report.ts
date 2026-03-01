export type ProblemSeverity = 'critical' | 'warning' | 'info';
export type ProblemCategory = 'cpu' | 'memory' | 'disk' | 'network' | 'kernel' | 'virtualization' | 'application' | 'file_system' | 'other';

export interface ProblemReport {
  id: string;
  sessionId: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  title: string;
  description: string;
  explanation?: string;
  metrics?: Record<string, unknown>;
  recommendations?: string[];
  relatedReportIds?: string[];
  detectedAt: string;
}

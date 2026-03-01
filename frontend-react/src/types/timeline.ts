export type TimelineEntryType = 'info' | 'error' | 'tool_execution' | 'problem_detected' | 'agent_decision' | 'user_interaction';

export interface TimelineEntry {
  id: string;
  sessionId: string;
  type: TimelineEntryType;
  description: string;
  metadata?: Record<string, unknown>;
  reasoning?: string;
  timestamp: string;
}

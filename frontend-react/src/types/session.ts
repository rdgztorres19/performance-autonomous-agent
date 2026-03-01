export type SessionStatus = 'running' | 'completed' | 'failed';

export interface Session {
  id: string;
  configurationId: string;
  status: SessionStatus;
  summary?: string;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

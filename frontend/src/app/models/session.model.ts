export type SessionStatus = 'running' | 'completed' | 'failed';

export interface Session {
  id: string;
  configurationId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
}

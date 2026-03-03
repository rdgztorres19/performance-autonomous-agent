export interface ConfigStatusPayload {
  id: string;
  connectionStatus: 'online' | 'offline' | 'unknown' | 'checking';
  connectionLastCheckedAt: string;
}

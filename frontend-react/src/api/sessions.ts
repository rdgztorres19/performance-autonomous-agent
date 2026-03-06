import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './client';
import type { Session } from '../types';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get<Session>(`/sessions/${id}`),
    enabled: !!id,
  });
}

export function useStartSession() {
  return useMutation({
    mutationFn: (configurationId: string) =>
      api.post<Session>('/sessions', { configurationId }),
  });
}

export function useStopSession() {
  return useMutation({
    mutationFn: (sessionId: string) => api.post(`/sessions/${sessionId}/stop`),
  });
}

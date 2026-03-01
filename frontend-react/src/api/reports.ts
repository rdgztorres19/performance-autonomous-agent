import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { ProblemReport } from '../types';

export function useReports(sessionId: string | null) {
  return useQuery({
    queryKey: ['reports', sessionId],
    queryFn: () => api.get<ProblemReport[]>(`/sessions/${sessionId}/reports`),
    enabled: !!sessionId,
  });
}

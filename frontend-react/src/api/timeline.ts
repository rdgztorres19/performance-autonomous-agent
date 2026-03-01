import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { TimelineEntry } from '../types';

export function useTimeline(sessionId: string | null) {
  return useQuery({
    queryKey: ['timeline', sessionId],
    queryFn: () => api.get<TimelineEntry[]>(`/sessions/${sessionId}/timeline`),
    enabled: !!sessionId,
  });
}

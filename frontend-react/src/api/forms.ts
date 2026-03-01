import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { FormInteraction } from '../types';

export function useForms(sessionId: string | null) {
  return useQuery({
    queryKey: ['forms', sessionId],
    queryFn: () => api.get<FormInteraction[]>(`/sessions/${sessionId}/forms`),
    enabled: !!sessionId,
  });
}

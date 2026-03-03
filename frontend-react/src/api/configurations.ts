import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Configuration, CreateConfigDto, UpdateConfigDto, VerifyConnectionDto } from '../types';

const KEYS = { all: ['configurations'] as const };

export function useConfigurations() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<Configuration[]>('/config'),
  });
}

export function useConfiguration(id: string) {
  return useQuery({
    queryKey: [...KEYS.all, id],
    queryFn: () => api.get<Configuration>(`/config/${id}`),
    enabled: !!id,
  });
}

export function useCreateConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateConfigDto) => api.post<Configuration>('/config', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateConfigDto }) =>
      api.put<Configuration>(`/config/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/config/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useVerifyConnection() {
  return useMutation({
    mutationFn: (dto: VerifyConnectionDto) =>
      api.post<{ success: boolean; connectionStatus: string }>('/config/verify', dto),
  });
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface MetricSnapshotDto {
  toolName: string;
  category: string;
  data: Record<string, unknown>;
  visualization: import('@/types').VisualizationSpec;
  executionTimeMs?: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpuPercent: number;
  memPercent: number;
  user: string;
}

export function useCollectMetrics() {
  return useMutation({
    mutationFn: ({ configId, pid }: { configId: string; pid?: number }) =>
      api.get<MetricSnapshotDto[]>(
        pid != null ? `/config/${configId}/metrics?pid=${pid}` : `/config/${configId}/metrics`,
      ),
  });
}

export function useProcessList(configId: string | null) {
  return useQuery({
    queryKey: ['processes', configId],
    queryFn: () => api.get<ProcessInfo[]>(`/config/${configId}/processes`),
    enabled: !!configId && configId !== '_',
    staleTime: 15_000,
  });
}

import { useMemo } from 'react';
import { useSessionStore } from '@/hooks/use-session-store';
import type { TimelineEntry } from '@/types/timeline';
import type { MetricSnapshot } from '@/types/metrics';
import type { VisualizationSpec } from '@/types';
import type { MetricCategory } from '@/types/metrics';
import type { MetricSnapshotDto } from '@/api/metrics';
import { CATEGORY_TO_LENS, TOOL_TO_CATEGORY } from '../metrics.constants';

const VALID_CATEGORIES: MetricCategory[] = [
  'cpu', 'memory', 'disk', 'network', 'kernel', 'file_system', 'virtualization',
  'application_latency', 'application_throughput', 'application_errors',
  'application_threading', 'application_cpu', 'application_memory',
  'application_io', 'runtime_specific',
];

/** Resolve category from metadata or tool name */
function resolveCategory(
  metaCategory: string | undefined,
  toolName: string,
): MetricCategory | null {
  const fromMeta = normalizeCategory(metaCategory);
  if (fromMeta) return fromMeta;
  return TOOL_TO_CATEGORY[toolName] ?? null;
}

export function normalizeCategory(cat: string | undefined): MetricCategory | null {
  if (!cat) return null;
  const c = String(cat).toLowerCase().replace(/-/g, '_');
  return VALID_CATEGORIES.includes(c as MetricCategory) ? (c as MetricCategory) : null;
}

/**
 * Normalizes API response (MetricSnapshotDto[]) to MetricSnapshot[].
 */
export function apiSnapshotsToMetricSnapshots(dtos: MetricSnapshotDto[]): MetricSnapshot[] {
  const ts = new Date().toISOString();
  return dtos
    .map((d) => {
      const category = resolveCategory(d.category, d.toolName);
      if (!category) return null;
      return {
        toolName: d.toolName,
        category,
        timestamp: ts,
        data: d.data,
        visualization: d.visualization,
      };
    })
    .filter((s): s is MetricSnapshot => s != null);
}

/**
 * Aggregates tool_execution timeline entries into MetricSnapshots.
 * Uses externalTimeline when provided, otherwise session store (active scan).
 * Memoized for performance — only recomputes when timeline changes.
 */
export function useMetricsDataFromTimeline(externalTimeline?: TimelineEntry[] | null) {
  const storeTimeline = useSessionStore((s) => s.timeline);
  const timeline = externalTimeline ?? storeTimeline;

  return useMemo(() => {
    const toolEntries = timeline.filter(
      (e) =>
        e.type === 'tool_execution' &&
        e.metadata?.visualization &&
        e.metadata?.output,
    );

    const snapshots: MetricSnapshot[] = toolEntries
      .map((e) => {
        const toolName = String(e.metadata?.toolName ?? '');
        const category = resolveCategory(
          e.metadata?.category as string | undefined,
          toolName,
        );
        if (!category) return null;
        return {
          toolName,
          category,
          timestamp: e.timestamp,
          data: e.metadata!.output as Record<string, unknown>,
          visualization: e.metadata!.visualization as VisualizationSpec,
        };
      })
      .filter((s): s is MetricSnapshot => s != null);

    return { snapshots };
  }, [timeline]);
}

/** @deprecated use useMetricsDataFromTimeline */
export function useMetricsData(externalTimeline?: TimelineEntry[] | null) {
  return useMetricsDataFromTimeline(externalTimeline);
}

/** Snapshots grouped by category for the active lens */
export function useMetricsByCategory(
  snapshots: MetricSnapshot[],
  lens: 'system' | 'application',
): Map<string, MetricSnapshot[]> {
  return useMemo(() => {
    const byCategory = new Map<string, MetricSnapshot[]>();

    for (const s of snapshots) {
      const cat = normalizeCategory(s.category);
      if (!cat) continue;
      const lensForCat = CATEGORY_TO_LENS[cat];
      if (lensForCat !== lens) continue;

      const list = byCategory.get(cat) ?? [];
      list.push(s);
      byCategory.set(cat, list);
    }

    // Keep most recent per tool in each category
    const deduped = new Map<string, MetricSnapshot[]>();
    byCategory.forEach((list, cat) => {
      const byTool = new Map<string, MetricSnapshot>();
      list
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .forEach((s) => {
          if (!byTool.has(s.toolName)) byTool.set(s.toolName, s);
        });
      deduped.set(cat, [...byTool.values()]);
    });

    return deduped;
  }, [snapshots, lens]);
}

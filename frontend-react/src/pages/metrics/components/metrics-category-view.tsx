import { memo } from 'react';
import { DynamicMetricsChart } from '@/components/metrics/dynamic-metrics-chart';
import { MetricCard } from '@/components/metrics/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import {
  classifyCpu,
  classifyMemory,
  classifyDisk,
} from '../lib/thresholds';
import type { MetricSnapshot } from '@/types/metrics';
import type { MetricCategory } from '@/types/metrics';

function resolveNested(data: Record<string, unknown>, field: string): number {
  const val = field.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace('%', '')) || 0;
  return 0;
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface MetricsCategoryViewProps {
  category: MetricCategory;
  snapshots: MetricSnapshot[];
  isLoading?: boolean;
  isEmpty?: boolean;
}

function MetricsCategoryViewInner({
  category,
  snapshots,
  isLoading,
  isEmpty,
}: MetricsCategoryViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isEmpty || snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-foreground mb-1">No data for this category</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          This category returned no metrics. Try collecting again or load a different session.
        </p>
      </div>
    );
  }

  const summaryCards = buildSummaryCards(snapshots, category);

  return (
    <div className="space-y-5">
      {/* KPI Stat Row — Datadog-style */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <MetricCard key={c.title} {...c} />
          ))}
        </div>
      )}

      {/* Chart Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {snapshots.map((s) => (
          <Card key={`${s.toolName}-${s.timestamp}`} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                {formatToolName(s.toolName)}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {new Date(s.timestamp).toLocaleTimeString()}
              </span>
            </CardHeader>
            <CardContent className="flex-1 min-h-[260px] flex flex-col justify-center">
              <DynamicMetricsChart
                visualization={s.visualization}
                data={s.data}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface SummaryCard {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  state?: import('@/types/metrics').ThresholdState;
}

function buildSummaryCards(
  snapshots: MetricSnapshot[],
  category: MetricCategory,
): SummaryCard[] {
  const cards: SummaryCard[] = [];

  for (const s of snapshots) {
    const data = s.data;

    if (category === 'cpu') {
      const cpu = resolveNested(data, 'cpuPercent') || resolveNested(data, 'utilizationPercent') || 0;
      if (cpu > 0) {
        cards.push({ title: 'CPU Usage', value: cpu.toFixed(1), unit: '%', state: classifyCpu(cpu) });
      }
      const load1 = data.load1m ?? data.loadAverage1m;
      const load5 = data.load5m ?? data.loadAverage5m;
      const load15 = data.load15m ?? data.loadAverage15m;
      if (typeof load1 === 'number') {
        cards.push({
          title: 'Load Average',
          value: Number(load1).toFixed(2),
          subtitle: `5m: ${Number(load5 ?? 0).toFixed(2)} · 15m: ${Number(load15 ?? 0).toFixed(2)}`,
        });
      }
      const cores = data.coreCount ?? data.cpuCount;
      if (typeof cores === 'number') {
        cards.push({ title: 'CPU Cores', value: cores });
      }
    }

    if (category === 'memory') {
      const mem = resolveNested(data, 'usagePercent') || resolveNested(data, 'utilizationPercent') || 0;
      if (mem > 0) {
        cards.push({ title: 'Memory Usage', value: mem.toFixed(1), unit: '%', state: classifyMemory(mem) });
      }
      const total = data.totalMb ?? data.totalGb;
      const used = data.usedMb ?? data.usedGb;
      const suffix = data.totalGb ? ' GB' : ' MB';
      if (typeof total === 'number') {
        cards.push({ title: 'Total RAM', value: Number(total).toFixed(1), unit: suffix.trim() });
      }
      if (typeof used === 'number') {
        cards.push({ title: 'Used RAM', value: Number(used).toFixed(1), unit: suffix.trim() });
      }
    }

    if (category === 'disk') {
      const disk = resolveNested(data, 'usagePercent') || resolveNested(data, 'utilizationPercent') || 0;
      if (disk > 0) {
        cards.push({ title: 'Disk Usage', value: disk.toFixed(1), unit: '%', state: classifyDisk(disk) });
      }
      const readMb = data.readMbPerSec ?? data.readBytesPerSec;
      const writeMb = data.writeMbPerSec ?? data.writeBytesPerSec;
      if (typeof readMb === 'number') {
        cards.push({ title: 'Read Speed', value: Number(readMb).toFixed(1), unit: 'MB/s' });
      }
      if (typeof writeMb === 'number') {
        cards.push({ title: 'Write Speed', value: Number(writeMb).toFixed(1), unit: 'MB/s' });
      }
    }

    if (category === 'network') {
      const rxMb = data.rxMbPerSec ?? data.receiveMbps;
      const txMb = data.txMbPerSec ?? data.transmitMbps;
      if (typeof rxMb === 'number') {
        cards.push({ title: 'RX Throughput', value: Number(rxMb).toFixed(2), unit: 'Mbps' });
      }
      if (typeof txMb === 'number') {
        cards.push({ title: 'TX Throughput', value: Number(txMb).toFixed(2), unit: 'Mbps' });
      }
      const errors = data.errors ?? data.errorCount;
      if (typeof errors === 'number') {
        cards.push({ title: 'Errors', value: errors });
      }
    }
  }

  return cards.slice(0, 4);
}

export const MetricsCategoryView = memo(MetricsCategoryViewInner);

import { memo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MetricView, TimeRangePreset } from '@/types/metrics';
import { cn } from '@/lib/utils';

export interface MetricsContextBannerProps {
  view: MetricView;
  onViewChange: (v: MetricView) => void;
  timeRange?: TimeRangePreset;
  onTimeRangeChange?: (r: TimeRangePreset) => void;
  lastUpdated?: Date | null;
  className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRangePreset; label: string }[] = [
  { value: '1h', label: 'Last 1h' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
];

function MetricsContextBannerInner({
  view,
  onViewChange,
  timeRange = '24h',
  onTimeRangeChange,
  lastUpdated,
  className,
}: MetricsContextBannerProps) {
  const updatedText = lastUpdated
    ? `Updated ${formatRelative(lastUpdated)}`
    : null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as MetricView)}>
          <TabsList variant="button" size="sm">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'historical' && onTimeRangeChange && (
          <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRangePreset)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {view === 'live' && updatedText && (
          <span className="text-sm text-muted-foreground">{updatedText}</span>
        )}
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export const MetricsContextBanner = memo(MetricsContextBannerInner);

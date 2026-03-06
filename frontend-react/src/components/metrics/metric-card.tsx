import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ThresholdState } from '@/types/metrics';

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  state?: ThresholdState;
  sparkline?: number[];
  subtitle?: string;
  className?: string;
}

const STATE_CONFIG: Record<ThresholdState, {
  bg: string;
  badge: string;
  bar: string;
  label: string;
  icon: typeof TrendingUp;
}> = {
  low: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    badge: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950',
    bar: 'bg-emerald-500',
    label: 'Good',
    icon: TrendingDown,
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    badge: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950',
    bar: 'bg-amber-500',
    label: 'Warning',
    icon: Minus,
  },
  high: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    badge: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950',
    bar: 'bg-red-500',
    label: 'Critical',
    icon: TrendingUp,
  },
  unknown: {
    bg: '',
    badge: 'text-muted-foreground bg-muted',
    bar: 'bg-muted-foreground/40',
    label: '',
    icon: Minus,
  },
};

function MetricCardInner({ title, value, unit, state = 'unknown', sparkline, subtitle, className }: MetricCardProps) {
  const config = STATE_CONFIG[state];
  const numVal = typeof value === 'string' ? parseFloat(value) : value;
  const barWidth = !isNaN(numVal) && unit === '%' ? Math.min(100, Math.max(0, numVal)) : null;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm',
        className,
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">
          {title}
        </p>
        {state !== 'unknown' && (
          <span className={cn('text-2xs font-semibold px-2 py-0.5 rounded-full shrink-0', config.badge)}>
            {config.label}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-base font-medium text-muted-foreground">{unit}</span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}

      {/* Progress bar for percentages */}
      {barWidth !== null && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', config.bar)}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}

      {/* Sparkline */}
      {!barWidth && sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-px h-7">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className={cn('flex-1 min-w-[2px] rounded-sm opacity-70', config.bar || 'bg-muted-foreground/40')}
              style={{ height: `${Math.min(100, Math.max(8, v))}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const MetricCard = memo(MetricCardInner);

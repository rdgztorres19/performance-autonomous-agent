import { memo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Cpu } from 'lucide-react';
import type { MetricLens } from '@/types/metrics';
import { cn } from '@/lib/utils';

export interface MetricsLensTabsProps {
  value: MetricLens;
  onChange: (lens: MetricLens) => void;
  className?: string;
}

function MetricsLensTabsInner({ value, onChange, className }: MetricsLensTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MetricLens)}>
      <TabsList variant="button" className={cn('gap-1', className)}>
        <TabsTrigger value="system" className="gap-1.5">
          <Server className="size-3.5" />
          System
        </TabsTrigger>
        <TabsTrigger value="application" className="gap-1.5">
          <Cpu className="size-3.5" />
          Application
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export const MetricsLensTabs = memo(MetricsLensTabsInner);

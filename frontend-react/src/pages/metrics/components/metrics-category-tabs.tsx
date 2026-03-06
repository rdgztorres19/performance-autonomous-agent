import { memo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MetricCategory } from '@/types/metrics';
import {
  SYSTEM_CATEGORIES,
  APPLICATION_CATEGORIES,
  CATEGORY_LABELS,
} from '../metrics.constants';
import { cn } from '@/lib/utils';

export interface MetricsCategoryTabsProps {
  lens: 'system' | 'application';
  value: MetricCategory;
  onChange: (cat: MetricCategory) => void;
  className?: string;
}

function MetricsCategoryTabsInner({
  lens,
  value,
  onChange,
  className,
}: MetricsCategoryTabsProps) {
  const categories =
    lens === 'system' ? SYSTEM_CATEGORIES : APPLICATION_CATEGORIES;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <Tabs value={value} onValueChange={(v) => onChange(v as MetricCategory)}>
        <TabsList variant="line" className="w-max border-0 p-0 h-auto gap-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              variant="line"
              size="sm"
            >
              {CATEGORY_LABELS[cat]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

export const MetricsCategoryTabs = memo(MetricsCategoryTabsInner);

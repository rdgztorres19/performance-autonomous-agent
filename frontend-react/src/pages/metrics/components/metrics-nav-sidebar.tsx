import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Settings2,
  FolderOpen,
  Layers,
  Timer,
  TrendingUp,
  AlertTriangle,
  GitBranch,
  ArrowLeftRight,
  Code,
  Server,
  AppWindow,
  type LucideIcon,
} from 'lucide-react';
import type { MetricLens, MetricCategory } from '@/types/metrics';
import { SYSTEM_CATEGORIES, APPLICATION_CATEGORIES, CATEGORY_LABELS } from '../metrics.constants';

const CATEGORY_ICONS: Record<MetricCategory, LucideIcon> = {
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
  network: Network,
  kernel: Settings2,
  file_system: FolderOpen,
  virtualization: Layers,
  application_latency: Timer,
  application_throughput: TrendingUp,
  application_errors: AlertTriangle,
  application_threading: GitBranch,
  application_cpu: Cpu,
  application_memory: MemoryStick,
  application_io: ArrowLeftRight,
  runtime_specific: Code,
};

export interface MetricsNavSidebarProps {
  lens: MetricLens;
  category: MetricCategory;
  onLensChange: (lens: MetricLens) => void;
  onCategoryChange: (cat: MetricCategory) => void;
  className?: string;
}

function MetricsNavSidebarInner({
  lens,
  category,
  onLensChange,
  onCategoryChange,
  className,
}: MetricsNavSidebarProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* System Section */}
        <div className="p-2">
          <button
            onClick={() => {
              onLensChange('system');
              onCategoryChange('cpu');
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              lens === 'system'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Server className="h-4 w-4 shrink-0" />
            System Metrics
          </button>

          {lens === 'system' && (
            <div className="mt-1 space-y-0.5 pl-1">
              {SYSTEM_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-blue-600 dark:text-blue-400' : '')} />
                    {CATEGORY_LABELS[cat]}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mx-3 border-b border-border" />

        {/* Application Section */}
        <div className="p-2">
          <button
            onClick={() => {
              onLensChange('application');
              onCategoryChange('application_cpu');
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              lens === 'application'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <AppWindow className="h-4 w-4 shrink-0" />
            Application Metrics
          </button>

          {lens === 'application' && (
            <div className="mt-1 space-y-0.5 pl-1">
              {APPLICATION_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                      isActive
                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-violet-600 dark:text-violet-400' : '')} />
                    {CATEGORY_LABELS[cat]}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const MetricsNavSidebar = memo(MetricsNavSidebarInner);

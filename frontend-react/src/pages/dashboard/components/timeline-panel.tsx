import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MetricsDialog } from '@/components/metrics/metrics-dialog';
import { useSessionStore } from '@/hooks/use-session-store';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  Brain,
  Wrench,
  MessageSquare,
  ChevronDown,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEntryType, VisualizationSpec } from '@/types';

const typeConfig: Record<
  TimelineEntryType,
  {
    label: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  info: {
    label: 'Info',
    icon: Info,
    iconBg: 'bg-gray-200 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    badgeVariant: 'secondary',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeVariant: 'destructive',
  },
  problem_detected: {
    label: 'Problem',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeVariant: 'outline',
  },
  agent_decision: {
    label: 'Decision',
    icon: Brain,
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeVariant: 'primary',
  },
  tool_execution: {
    label: 'Tool',
    icon: Wrench,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeVariant: 'secondary',
  },
  user_interaction: {
    label: 'User',
    icon: MessageSquare,
    iconBg: 'bg-sky-100 dark:bg-sky-950',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeVariant: 'outline',
  },
};

const MAX_DESC_LEN = 80;

export function TimelinePanel() {
  const timeline = useSessionStore((s) => s.timeline);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [metricsEntry, setMetricsEntry] = useState<{
    toolName: string;
    data: Record<string, unknown>;
    visualization: VisualizationSpec;
  } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline.length]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 shrink-0">
        <CardTitle className="text-base">Timeline</CardTitle>
        <Badge variant="secondary" className="text-2xs">{timeline.length}</Badge>
      </CardHeader>
      <CardContent className="grow p-0">
        <ScrollArea className="h-[480px]">
          <div className="px-5 pt-5 pb-5">
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Info className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                <p className="text-2sm text-muted-foreground/70 mt-0.5">
                  Start a session to see the agent timeline.
                </p>
              </div>
            ) : (
              <div>
                {timeline.map((entry, idx) => {
                  const cfg = typeConfig[entry.type] ?? typeConfig.info;
                  const isLast = idx === timeline.length - 1;
                  const Icon = cfg.icon;
                  const isOpen = expanded.has(entry.id);
                  const canExpand = entry.description.length > MAX_DESC_LEN || !!entry.reasoning;
                  const shortDesc =
                    entry.description.length > MAX_DESC_LEN
                      ? entry.description.substring(0, MAX_DESC_LEN) + '...'
                      : entry.description;

                  return (
                    <div key={entry.id} className="flex items-start relative">
                      {!isLast && (
                        <div className="w-9 start-0 top-9 absolute bottom-0 translate-x-1/2 border-s border-s-border" />
                      )}
                      <div className={cn('flex items-center justify-center shrink-0 rounded-full size-9', cfg.iconBg)}>
                        <Icon size={16} className={cfg.iconColor} />
                      </div>
                      <div className="ps-3 pb-6 grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={cfg.badgeVariant} className="text-2xs shrink-0">
                              {cfg.label}
                            </Badge>
                            {entry.type === 'tool_execution' && entry.metadata?.visualization && entry.metadata?.output && (
                              <button
                                onClick={() => setMetricsEntry({
                                  toolName: String(entry.metadata?.toolName ?? ''),
                                  data: entry.metadata!.output as Record<string, unknown>,
                                  visualization: entry.metadata!.visualization as VisualizationSpec,
                                })}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                title="View metrics chart"
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-2xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {canExpand ? (
                          <Collapsible open={isOpen} onOpenChange={() => toggle(entry.id)}>
                            <p className="text-2sm text-foreground mt-1.5 leading-relaxed">
                              {isOpen ? entry.description : shortDesc}
                            </p>

                            <CollapsibleContent>
                              {entry.reasoning && (
                                <div className="mt-2 rounded-md px-3 py-2 bg-blue-50 dark:bg-blue-950/60 border-s-2 border-s-blue-400 dark:border-s-blue-500">
                                  <p className="text-2sm text-blue-900 dark:text-blue-200 italic leading-relaxed">
                                    {entry.reasoning}
                                  </p>
                                </div>
                              )}
                            </CollapsibleContent>

                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-0 text-2xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 mt-1"
                              >
                                <ChevronDown className={cn('h-3 w-3 me-1 transition-transform', isOpen && 'rotate-180')} />
                                {isOpen ? 'Show less' : 'Show more'}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        ) : (
                          <p className="text-2sm text-foreground mt-1.5 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {metricsEntry && (
        <MetricsDialog
          open={!!metricsEntry}
          onOpenChange={(open) => { if (!open) setMetricsEntry(null); }}
          toolName={metricsEntry.toolName}
          data={metricsEntry.data}
          visualization={metricsEntry.visualization}
        />
      )}
    </Card>
  );
}

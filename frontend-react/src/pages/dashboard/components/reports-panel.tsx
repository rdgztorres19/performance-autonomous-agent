import { useState } from 'react';
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
import { useSessionStore } from '@/hooks/use-session-store';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Lightbulb,
  ShieldAlert,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProblemSeverity } from '@/types';

const severityConfig: Record<
  ProblemSeverity,
  {
    label: string;
    variant: 'destructive' | 'outline' | 'secondary';
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    accentBorder: string;
  }
> = {
  critical: {
    label: 'Critical',
    variant: 'destructive',
    icon: AlertCircle,
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400',
    accentBorder: 'border-s-red-500',
  },
  warning: {
    label: 'Warning',
    variant: 'outline',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accentBorder: 'border-s-amber-500',
  },
  info: {
    label: 'Info',
    variant: 'secondary',
    icon: Info,
    iconBg: 'bg-sky-100 dark:bg-sky-950',
    iconColor: 'text-sky-600 dark:text-sky-400',
    accentBorder: 'border-s-sky-500',
  },
};

export function ReportsPanel() {
  const reports = useSessionStore((s) => s.reports);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 shrink-0">
        <CardTitle className="text-base">Problem Reports</CardTitle>
        <Badge
          variant={reports.some((r) => r.severity === 'critical') ? 'destructive' : 'secondary'}
          className="text-2xs"
        >
          {reports.length}
        </Badge>
      </CardHeader>
      <CardContent className="grow p-0">
        <ScrollArea className="h-[620px]">
          <div className="px-5 pt-5 pb-5">
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No problems detected</p>
                <p className="text-2sm text-muted-foreground/70 mt-0.5">
                  Issues will appear here as the agent finds them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const cfg = severityConfig[report.severity] ?? severityConfig.info;
                  const SevIcon = cfg.icon;
                  const isOpen = expandedIds.has(report.id);
                  const hasDetails =
                    !!report.explanation ||
                    (report.recommendations && report.recommendations.length > 0) ||
                    !!report.metrics;

                  return (
                    <Collapsible
                      key={report.id}
                      open={isOpen}
                      onOpenChange={() => toggle(report.id)}
                    >
                      <div className={cn('rounded-lg border border-border overflow-hidden border-s-3', cfg.accentBorder)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full text-left p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-start gap-3">
                              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5', cfg.iconBg)}>
                                <SevIcon size={16} className={cfg.iconColor} />
                              </div>
                              <div className="grow min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant={cfg.variant} className="text-2xs">
                                      {cfg.label}
                                    </Badge>
                                    <Badge variant="secondary" className="text-2xs">
                                      {report.category}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-2xs text-muted-foreground">
                                      {new Date(report.detectedAt).toLocaleTimeString()}
                                    </span>
                                    {hasDetails && (
                                      <ChevronDown
                                        className={cn(
                                          'h-4 w-4 text-muted-foreground transition-transform',
                                          isOpen && 'rotate-180',
                                        )}
                                      />
                                    )}
                                  </div>
                                </div>
                                <h4 className="text-sm font-semibold text-foreground leading-snug">
                                  {report.title}
                                </h4>
                                {!isOpen && (
                                  <p className="text-2sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                    {report.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 ms-12">
                            <p className="text-2sm text-foreground leading-relaxed">
                              {report.description}
                            </p>

                            {report.explanation && (
                              <div className="rounded-md px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                                <p className="text-2sm text-foreground leading-relaxed">
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">Root cause: </span>
                                  {report.explanation}
                                </p>
                              </div>
                            )}

                            {report.recommendations && report.recommendations.length > 0 && (
                              <div className="rounded-md px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-2sm font-semibold text-foreground">
                                    Recommendations
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {report.recommendations.map((rec, i) => (
                                    <li key={i} className="text-2sm text-foreground flex items-start gap-2">
                                      <span className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 text-xs">▸</span>
                                      <span className="leading-relaxed">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {report.metrics && (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-2sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                  >
                                    <Code className="h-3 w-3 me-1.5" />
                                    View Metrics
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <pre className="text-xs bg-muted text-foreground p-3 rounded-md overflow-auto max-h-40 font-mono mt-1 border border-border">
                                    {JSON.stringify(report.metrics, null, 2)}
                                  </pre>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

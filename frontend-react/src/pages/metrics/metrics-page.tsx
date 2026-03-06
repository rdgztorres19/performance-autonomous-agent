import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import {
  BarChart3,
  Play,
  Loader2,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useConfigurations } from '@/api/configurations';
import { useCollectMetrics, useProcessList } from '@/api/metrics';
import {
  useMetricsDataFromTimeline,
  useMetricsByCategory,
  apiSnapshotsToMetricSnapshots,
} from './hooks/use-metrics-data';
import { MetricsNavSidebar } from './components/metrics-nav-sidebar';
import { MetricsCategoryView } from './components/metrics-category-view';
import { SYSTEM_CATEGORIES, APPLICATION_CATEGORIES } from './metrics.constants';
import type { MetricLens, MetricCategory } from '@/types/metrics';
import { Container } from '@/components/common/container';
import { ContentLoader } from '@/components/common/content-loader';
import { cn } from '@/lib/utils';

// ── Refresh interval options (mirrors Grafana) ────────────────────────────
const REFRESH_OPTIONS = [
  { label: 'Off', ms: null },
  { label: '5s', ms: 5_000 },
  { label: '10s', ms: 10_000 },
  { label: '30s', ms: 30_000 },
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '15m', ms: 900_000 },
  { label: '30m', ms: 1_800_000 },
] as const;

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function MetricsPageContent() {
  const [configId, setConfigId] = useState('');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [apiSnapshots, setApiSnapshots] = useState<ReturnType<typeof apiSnapshotsToMetricSnapshots> | null>(null);
  const [refreshMs, setRefreshMs] = useState<number | null>(null);
  const [lastCollectAt, setLastCollectAt] = useState<Date | null>(null);

  const [lens, setLens] = useState<MetricLens>('system');
  const [category, setCategory] = useState<MetricCategory>('cpu');

  const { data: configs } = useConfigurations();
  const { data: processes, isLoading: processesLoading } = useProcessList(
    lens === 'application' && configId && configId !== '_' ? configId : null,
  );
  const collectMutation = useCollectMetrics();

  const { snapshots: timelineSnapshots } = useMetricsDataFromTimeline(null);

  const snapshots = useMemo(() => {
    if (apiSnapshots && apiSnapshots.length > 0) return apiSnapshots;
    return timelineSnapshots;
  }, [apiSnapshots, timelineSnapshots]);

  const byCategory = useMetricsByCategory(snapshots, lens);
  const categories = lens === 'system' ? SYSTEM_CATEGORIES : APPLICATION_CATEGORIES;
  const categorySnapshots = byCategory.get(category) ?? [];
  const hasData = snapshots.length > 0;
  const selectedConfig = configs?.find((c) => c.id === configId);
  const isLive = refreshMs !== null;

  const handleCollect = useCallback(async () => {
    if (!configId || configId === '_') return;
    try {
      const pid = lens === 'application' && selectedPid ? selectedPid : undefined;
      const data = await collectMutation.mutateAsync({ configId, pid });
      setApiSnapshots(apiSnapshotsToMetricSnapshots(data));
      setLastCollectAt(new Date());
    } catch {
      // keep previous data on error
    }
  }, [configId, lens, selectedPid, collectMutation]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshMs || !configId || configId === '_') return;
    const id = setInterval(handleCollect, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, configId, handleCollect]);

  const handleLensChange = useCallback((newLens: MetricLens) => {
    setLens(newLens);
    setCategory(newLens === 'system' ? 'cpu' : 'application_cpu');
    if (newLens === 'system') setSelectedPid(null);
  }, []);

  const currentRefreshLabel = REFRESH_OPTIONS.find((o) => o.ms === refreshMs)?.label ?? 'Off';

  return (
    <Container width="fluid">
      <div className="grid gap-4 lg:gap-5">

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

          {/* Left: icon + title + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <span>Performance Agent</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="text-foreground font-medium truncate">Metrics Center</span>
              </div>
              <h1 className="text-lg font-bold text-foreground leading-none truncate">
                System &amp; Application Metrics
              </h1>
            </div>
          </div>

          {/* Right: target selector + collect + refresh dropdown */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Last updated */}
            {lastCollectAt && hasData && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                {formatRelative(lastCollectAt)}
              </span>
            )}

            {/* Target selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9">
              <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={configId || '_'}
                onValueChange={(v) => {
                  if (v !== '_') setConfigId(v);
                  setApiSnapshots(null);
                  setRefreshMs(null);
                }}
              >
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 min-w-[140px] text-sm font-medium">
                  <SelectValue placeholder="Select target…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_" disabled>Select target…</SelectItem>
                  {configs?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span>{c.name}</span>
                      <Badge variant="secondary" className="ml-2 text-2xs">{c.connectionType}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Collect button */}
            <Button
              size="sm"
              className="h-9 gap-1.5 px-4"
              onClick={handleCollect}
              disabled={!configId || configId === '_' || collectMutation.isPending}
            >
              {collectMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />
              }
              {collectMutation.isPending ? 'Collecting…' : 'Collect'}
            </Button>

            {/* Grafana-style refresh interval dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 gap-1.5 px-3 font-medium',
                    isLive && 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60',
                  )}
                  disabled={!configId || configId === '_'}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLive && 'animate-spin')} />
                  {currentRefreshLabel}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                  Refresh
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REFRESH_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.label}
                    onClick={() => {
                      setRefreshMs(opt.ms);
                      if (opt.ms !== null) handleCollect();
                    }}
                    className={cn(
                      'text-sm cursor-pointer',
                      refreshMs === opt.ms && 'bg-accent text-accent-foreground font-medium',
                    )}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Status bar ──────────────────────────────────────────────── */}
        {selectedConfig && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-border bg-card/60 text-sm">
            {hasData
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <span className="font-medium text-foreground">{selectedConfig.name}</span>
            <span className="text-muted-foreground/50">·</span>
            <Badge variant="secondary" className="text-xs">{selectedConfig.connectionType}</Badge>
            {hasData && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {snapshots.length} metric{snapshots.length !== 1 ? 's' : ''} collected
                </span>
              </>
            )}
            {isLive && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live · every {currentRefreshLabel}
                </span>
              </>
            )}
          </div>
        )}

        {/* ── Main layout ──────────────────────────────────────────────── */}
        {hasData ? (
          <div className="grid lg:grid-cols-12 gap-5 items-start">

            {/* Sidebar nav */}
            <div className="lg:col-span-3 lg:sticky lg:top-5 space-y-3">
              <MetricsNavSidebar
                lens={lens}
                category={category}
                onLensChange={handleLensChange}
                onCategoryChange={setCategory}
              />

              {/* Process selector — only when Application lens */}
              {lens === 'application' && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Target Process
                    </p>
                  </div>
                  <div className="p-3">
                    {processesLoading ? (
                      <p className="text-xs text-muted-foreground px-1">Loading processes…</p>
                    ) : !processes?.length ? (
                      <p className="text-xs text-muted-foreground px-1">No processes found</p>
                    ) : (
                      <Select
                        value={selectedPid?.toString() ?? '_'}
                        onValueChange={(v) => setSelectedPid(v === '_' ? null : parseInt(v, 10))}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Select process…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">All processes</SelectItem>
                          {processes.map((p) => (
                            <SelectItem key={p.pid} value={p.pid.toString()}>
                              <div className="flex items-center gap-2 min-w-0">
                                <code className="text-xs text-muted-foreground shrink-0">{p.pid}</code>
                                <span className="truncate font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0 ml-auto">{p.cpuPercent.toFixed(1)}%</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedPid && (
                      <p className="text-xs text-muted-foreground mt-2 px-1">
                        Click <strong>Collect</strong> to load metrics for PID {selectedPid}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="lg:col-span-9">
              {lens === 'application' && !selectedPid ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
                  <Server className="h-10 w-10 text-muted-foreground/30 mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">Select a target process</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Choose a process from the sidebar, then click <strong>Collect</strong> to capture application metrics for that process.
                  </p>
                </div>
              ) : (
                <MetricsCategoryView
                  category={category}
                  snapshots={categorySnapshots}
                  isEmpty={categorySnapshots.length === 0}
                />
              )}
            </div>
          </div>
        ) : (
          /* ── Empty state ─────────────────────────────────────────────── */
          <Card>
            <CardContent className="flex flex-col items-center text-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 mb-5">
                <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Start monitoring</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-8">
                Select a target above and click <strong>Collect</strong> to capture live system and application metrics.
              </p>
              <div className="flex items-center justify-center gap-10">
                {[
                  { icon: Activity, label: 'Real-time', desc: 'Live collection', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' },
                  { icon: BarChart3, label: 'Historical', desc: 'Session replay', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950' },
                  { icon: Server, label: 'Multi-target', desc: 'SSH or local', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-950' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', f.bg)}>
                      <f.icon className={cn('h-4 w-4', f.color)} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}

export function MetricsPage() {
  return (
    <div className="w-full min-h-0">
      <Suspense fallback={<ContentLoader />}>
        <MetricsPageContent />
      </Suspense>
    </div>
  );
}

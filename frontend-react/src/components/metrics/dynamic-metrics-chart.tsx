import { useMemo } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ChartDefinition, VisualizationSpec } from '@/types';

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

function resolveNestedField(data: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
}

function parseNumeric(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace('%', ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

interface ChartRendererProps {
  chart: ChartDefinition;
  data: Record<string, unknown>;
}

function DonutChart({ chart, data }: ChartRendererProps) {
  const { labels, series, colors } = useMemo(() => {
    if (chart.dynamicMapField) {
      const map = data[chart.dynamicMapField] as Record<string, number> | undefined;
      if (!map) return { labels: [], series: [], colors: CHART_COLORS };
      const entries = Object.entries(map).filter(([, v]) => v > 0);
      return {
        labels: entries.map(([k]) => k),
        series: entries.map(([, v]) => v),
        colors: CHART_COLORS.slice(0, entries.length),
      };
    }
    const slices = chart.slices ?? [];
    const validSlices = slices.filter((s) => parseNumeric(resolveNestedField(data, s.field)) > 0);
    return {
      labels: validSlices.map((s) => s.label),
      series: validSlices.map((s) => parseNumeric(resolveNestedField(data, s.field))),
      colors: validSlices.map((s, i) => s.color ?? CHART_COLORS[i % CHART_COLORS.length]),
    };
  }, [chart, data]);

  if (series.length === 0) return null;

  const options: ApexOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels,
    colors,
    legend: {
      position: 'bottom',
      labels: { colors: 'var(--color-foreground)' },
    },
    plotOptions: { pie: { donut: { size: '60%' }, expandOnClick: false } },
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    stroke: { width: 2, colors: ['var(--color-background)'] },
    tooltip: {
      y: { formatter: (val: number) => `${val.toFixed(1)}${chart.unit ? ' ' + chart.unit : ''}` },
    },
  };

  return <ApexChart options={options} series={series} type="donut" height={280} />;
}

function BarChart({ chart, data }: ChartRendererProps) {
  const { categories, seriesData } = useMemo(() => {
    if (chart.arrayField) {
      const arr = data[chart.arrayField] as Record<string, unknown>[] | undefined;
      if (!arr?.length) return { categories: [] as string[], seriesData: [] as ApexAxisChartSeries };

      const cats = arr.map((item) => String(item[chart.labelField ?? ''] ?? ''));

      if (chart.valueFields?.length) {
        return {
          categories: cats,
          seriesData: chart.valueFields.map((vf, i) => ({
            name: vf.label,
            data: arr.map((item) => parseNumeric(item[vf.field])),
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
        };
      }

      return {
        categories: cats,
        seriesData: [{
          name: chart.title,
          data: arr.map((item) => parseNumeric(item[chart.valueField ?? ''])),
          color: CHART_COLORS[0],
        }],
      };
    }

    const slices = chart.slices ?? [];
    return {
      categories: slices.map((s) => s.label),
      seriesData: [{
        name: chart.title,
        data: slices.map((s) => parseNumeric(resolveNestedField(data, s.field))),
      }] as ApexAxisChartSeries,
    };
  }, [chart, data]);

  if (categories.length === 0) return null;

  const isHorizontal = chart.type === 'horizontalBar';

  const options: ApexOptions = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: isHorizontal, borderRadius: 4, columnWidth: '60%', barHeight: '60%' } },
    xaxis: {
      categories,
      labels: { style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' } },
    },
    colors: seriesData.map((s, i) => (s as { color?: string }).color ?? CHART_COLORS[i % CHART_COLORS.length]),
    dataLabels: { enabled: false },
    grid: { borderColor: 'var(--color-border)', strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (val: number) => `${val.toFixed(2)}${chart.unit ? ' ' + chart.unit : ''}` },
    },
    legend: {
      show: seriesData.length > 1,
      labels: { colors: 'var(--color-foreground)' },
    },
  };

  return <ApexChart options={options} series={seriesData} type="bar" height={280} />;
}

function RadialBarChart({ chart, data }: ChartRendererProps) {
  const value = useMemo(() => {
    if (!chart.gaugeField) return 0;
    return parseNumeric(resolveNestedField(data, chart.gaugeField));
  }, [chart, data]);

  const max = chart.gaugeMax ?? 100;
  const pct = Math.min((value / max) * 100, 100);

  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';

  const options: ApexOptions = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        track: { background: 'var(--color-muted)', strokeWidth: '100%' },
        dataLabels: {
          name: { show: true, color: 'var(--color-muted-foreground)', fontSize: '13px', offsetY: -10 },
          value: {
            show: true,
            color: 'var(--color-foreground)',
            fontSize: '24px',
            fontWeight: 700,
            formatter: () => `${value.toFixed(1)}${chart.unit ? chart.unit : ''}`,
          },
        },
      },
    },
    colors: [color],
    labels: [chart.title],
    stroke: { lineCap: 'round' },
  };

  return <ApexChart options={options} series={[pct]} type="radialBar" height={260} />;
}

interface DynamicMetricsChartProps {
  visualization: VisualizationSpec;
  data: Record<string, unknown>;
}

export function DynamicMetricsChart({ visualization, data }: DynamicMetricsChartProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: visualization.charts.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr' }}>
      {visualization.charts.map((chart, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{chart.title}</h4>
          {chart.type === 'donut' && <DonutChart chart={chart} data={data} />}
          {(chart.type === 'bar' || chart.type === 'horizontalBar') && <BarChart chart={chart} data={data} />}
          {chart.type === 'radialBar' && <RadialBarChart chart={chart} data={data} />}
        </div>
      ))}
    </div>
  );
}

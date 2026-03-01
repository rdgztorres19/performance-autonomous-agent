export type ChartType = 'donut' | 'bar' | 'horizontalBar' | 'radialBar' | 'area';

export interface ChartSlice {
  label: string;
  field: string;
  color?: string;
}

export interface ChartDefinition {
  type: ChartType;
  title: string;
  unit?: string;
  slices?: ChartSlice[];
  arrayField?: string;
  labelField?: string;
  valueField?: string;
  valueFields?: { field: string; label: string }[];
  gaugeField?: string;
  gaugeMax?: number;
  dynamicMapField?: string;
}

export interface VisualizationSpec {
  charts: ChartDefinition[];
}

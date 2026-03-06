/**
 * Threshold classification for metric values.
 * Based on design doc section 5: Low (OK) / Medium (Attention) / High (Critical).
 */
import type { ThresholdState } from '@/types/metrics';

export const THRESHOLD_COLORS: Record<ThresholdState, string> = {
  low: '#10b981',   // green
  medium: '#f59e0b', // amber
  high: '#ef4444',  // red
  unknown: '#6b7280', // gray
};

export const THRESHOLD_BORDER_CLASSES: Record<ThresholdState, string> = {
  low: 'border-l-emerald-500 dark:border-l-emerald-400',
  medium: 'border-l-amber-500 dark:border-l-amber-400',
  high: 'border-l-red-500 dark:border-l-red-400',
  unknown: 'border-l-muted-foreground/50',
};

export const THRESHOLD_LABELS: Record<ThresholdState, string> = {
  low: 'OK',
  medium: 'Attention',
  high: 'Critical',
  unknown: '—',
};

/** CPU utilization: <70 OK, 70-90 Attention, >90 Critical */
export function classifyCpu(percent: number): ThresholdState {
  if (percent < 70) return 'low';
  if (percent <= 90) return 'medium';
  return 'high';
}

/** Memory utilization: <70 OK, 70-85 Attention, >85 Critical */
export function classifyMemory(percent: number): ThresholdState {
  if (percent < 70) return 'low';
  if (percent <= 85) return 'medium';
  return 'high';
}

/** Disk utilization: <80 OK, 80-90 Attention, >90 Critical */
export function classifyDisk(percent: number): ThresholdState {
  if (percent < 80) return 'low';
  if (percent <= 90) return 'medium';
  return 'high';
}

/** Generic percent metric with custom thresholds */
export function classifyPercent(
  value: number,
  lowMax: number,
  mediumMax: number,
): ThresholdState {
  if (value < lowMax) return 'low';
  if (value <= mediumMax) return 'medium';
  return 'high';
}

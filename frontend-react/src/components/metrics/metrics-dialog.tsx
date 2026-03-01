import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, BarChart3 } from 'lucide-react';
import { DynamicMetricsChart } from './dynamic-metrics-chart';
import type { VisualizationSpec } from '@/types';

interface MetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  data: Record<string, unknown>;
  visualization: VisualizationSpec;
  executionTimeMs?: number;
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MetricsDialog({
  open,
  onOpenChange,
  toolName,
  data,
  visualization,
  executionTimeMs,
}: MetricsDialogProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>{formatToolName(toolName)}</span>
            {executionTimeMs != null && (
              <Badge variant="secondary" className="ml-auto text-xs font-mono">
                {executionTimeMs}ms
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-y-auto pr-1">
          <DynamicMetricsChart visualization={visualization} data={data} />

          <div className="mt-4 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-muted-foreground"
            >
              <Code className="h-3.5 w-3.5 mr-1.5" />
              {showRaw ? 'Hide Raw Data' : 'Show Raw Data'}
            </Button>

            {showRaw && (
              <pre className="mt-2 rounded-lg bg-muted/50 p-3 text-xs font-mono text-foreground overflow-x-auto max-h-64 overflow-y-auto border border-border">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

import { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ProcessOption {
  pid: number;
  name: string;
  cpuPercent?: number;
}

export interface ProcessTargetSelectorProps {
  value: string | null;
  onValueChange: (pid: string | null) => void;
  processes: ProcessOption[];
  disabled?: boolean;
  className?: string;
}

function ProcessTargetSelectorInner({
  value,
  onValueChange,
  processes,
  disabled,
  className,
}: ProcessTargetSelectorProps) {
  const placeholder = processes.length === 0
    ? 'No monitored processes'
    : 'Select process';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Target process:
      </Label>
      <Select
        value={value ?? ''}
        onValueChange={(v) => onValueChange(v || null)}
        disabled={disabled || processes.length === 0}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {processes.map((p) => (
            <SelectItem key={p.pid} value={String(p.pid)}>
              <span className="font-mono">{p.name}</span>
              <span className="text-muted-foreground ml-2">(PID {p.pid})</span>
              {p.cpuPercent != null && (
                <span className="text-muted-foreground ml-1">
                  — {p.cpuPercent.toFixed(1)}% CPU
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const ProcessTargetSelector = memo(ProcessTargetSelectorInner);

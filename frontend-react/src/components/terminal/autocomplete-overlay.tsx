import { useEffect, useRef } from 'react';
import { Copy, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteOverlayProps {
  items: string[];
  selectedIndex: number;
  onSelect: (item: string) => void;
  position?: { top: number; left: number };
  className?: string;
  firstItemLabel?: string;
  /** When true, shows copy & execute buttons for each command (command bar mode) */
  showCommandActions?: boolean;
  onCopy?: (item: string) => void;
  onExecute?: (item: string) => void;
}

export function AutocompleteOverlay({
  items,
  selectedIndex,
  onSelect,
  position = { top: 0, left: 0 },
  className,
  firstItemLabel,
  showCommandActions,
  onCopy,
  onExecute,
}: AutocompleteOverlayProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex];
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'z-50 max-h-48 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-xl dark:bg-zinc-900 dark:border-zinc-700',
        className,
      )}
      style={{ top: position.top, left: position.left }}
    >
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border dark:border-zinc-700">
        {showCommandActions ? 'Pick, copy, or run' : 'Pick one (↑↓ Enter) or click'}
      </p>
      <ul ref={listRef} className="max-h-36 overflow-auto py-1">
        {items.map((item, i) => (
          <li
            key={`${i}-${item}`}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors',
              i === selectedIndex
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'hover:bg-muted dark:hover:bg-zinc-800',
              showCommandActions && 'cursor-default',
            )}
          >
            <button
              type="button"
              className={cn(
                'min-w-0 flex-1 text-left',
                !showCommandActions && 'cursor-pointer',
              )}
              onClick={() => onSelect(item)}
            >
              {i === 0 && firstItemLabel ? (
                <>
                  <span className="text-muted-foreground">{firstItemLabel}: </span>
                  <span className="font-medium">{item}</span>
                </>
              ) : (
                item
              )}
            </button>
            {showCommandActions && (
              <div className="flex shrink-0 gap-0.5 opacity-70 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy?.(item);
                  }}
                  className="rounded p-1.5 hover:bg-white/20"
                  title="Copy to clipboard"
                  aria-label="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecute?.(item);
                  }}
                  className="rounded p-1.5 hover:bg-white/20"
                  title="Send to terminal"
                  aria-label="Execute"
                >
                  <Terminal className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AutocompleteOverlayProps {
  items: string[];
  selectedIndex: number;
  onSelect: (item: string) => void;
  position?: { top: number; left: number };
  className?: string;
  firstItemLabel?: string;
}

export function AutocompleteOverlay({
  items,
  selectedIndex,
  onSelect,
  position = { top: 0, left: 0 },
  className,
  firstItemLabel,
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
        Pick one (↑↓ Enter) or click
      </p>
      <ul ref={listRef} className="max-h-36 overflow-auto py-1">
        {items.map((item, i) => (
          <li
            key={`${i}-${item}`}
            className={`cursor-pointer px-3 py-2 text-sm font-mono transition-colors ${
              i === selectedIndex
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'hover:bg-muted dark:hover:bg-zinc-800'
            }`}
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
          </li>
        ))}
      </ul>
    </div>
  );
}

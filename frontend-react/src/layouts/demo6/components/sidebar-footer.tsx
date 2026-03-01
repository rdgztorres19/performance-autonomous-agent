import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function SidebarFooter() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-center justify-between shrink-0 ps-4 pe-3.5 h-14">
      <span className="text-xs text-muted-foreground">Performance Agent v1.0</span>
      <Button
        variant="ghost"
        mode="icon"
        className="hover:bg-background hover:[&_svg]:text-primary"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? (
          <Sun className="size-4.5!" />
        ) : (
          <Moon className="size-4.5!" />
        )}
      </Button>
    </div>
  );
}

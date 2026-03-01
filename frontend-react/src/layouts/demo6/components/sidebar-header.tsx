import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export function SidebarHeader() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between gap-2.5 px-3.5 h-[70px]">
        <Link to="/">
          <img
            src={toAbsoluteUrl('/media/app/mini-logo-circle.svg')}
            className="dark:hidden h-[42px]"
            alt="Performance Agent"
          />
          <img
            src={toAbsoluteUrl('/media/app/mini-logo-circle-dark.svg')}
            className="hidden dark:inline-block h-[42px]"
            alt="Performance Agent"
          />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer text-mono font-medium flex items-center justify-between gap-2 w-[150px]">
            Performance Agent
            <ChevronDown className="size-3.5! text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={10} side="bottom" align="start">
            <DropdownMenuItem asChild>
              <Link to="/">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/sessions">Session History</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/configuration">Configuration</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pt-2.5 px-3.5 mb-1">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 start-3.5 -translate-y-1/2 size-4" />
          <Input
            placeholder="Search"
            onChange={(e) => setSearchValue(e.target.value)}
            className="px-9 min-w-0"
            value={searchValue}
          />
          <span className="text-xs text-muted-foreground absolute end-3.5 top-1/2 -translate-y-1/2">
            cmd + /
          </span>
        </div>
      </div>
    </div>
  );
}

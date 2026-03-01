import { LayoutDashboard, History, Settings, Terminal } from 'lucide-react';
import type { MenuConfig } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'Workspace',
    icon: Terminal,
    path: '/',
  },
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    title: 'Session History',
    icon: History,
    path: '/sessions',
  },
  {
    title: 'Configuration',
    icon: Settings,
    path: '/configuration',
  },
];

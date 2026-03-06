import { LayoutDashboard, History, Settings, Terminal, BarChart3 } from 'lucide-react';
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
    title: 'Metrics',
    icon: BarChart3,
    path: '/metrics',
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

import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Demo6Layout } from '@/layouts/demo6/layout';

const DashboardPage = lazy(() =>
  import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const ConfigurationPage = lazy(() =>
  import('@/pages/configuration/configuration-page').then((m) => ({ default: m.ConfigurationPage })),
);
const SessionHistoryPage = lazy(() =>
  import('@/pages/session-history/session-history-page').then((m) => ({
    default: m.SessionHistoryPage,
  })),
);
const WorkspacePage = lazy(() =>
  import('@/pages/workspace/workspace-page').then((m) => ({ default: m.WorkspacePage })),
);
const MetricsPage = lazy(() =>
  import('@/pages/metrics/metrics-page').then((m) => ({ default: m.MetricsPage })),
);

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<Demo6Layout />}>
        <Route index element={<WorkspacePage />} />
        <Route path="/sessions" element={<SessionHistoryPage />} />
        <Route path="/configuration" element={<ConfigurationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

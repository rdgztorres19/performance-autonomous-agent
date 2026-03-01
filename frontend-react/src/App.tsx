import { Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { SettingsProvider } from './providers/settings-provider';
import { ThemeProvider } from './providers/theme-provider';
import { TooltipsProvider } from './providers/tooltips-provider';
import { AppRoutingSetup } from './routing/app-routing-setup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <HelmetProvider>
            <TooltipsProvider>
              <LoadingBarContainer>
                <BrowserRouter>
                  <Toaster richColors position="top-right" />
                  <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
                    <AppRoutingSetup />
                  </Suspense>
                </BrowserRouter>
              </LoadingBarContainer>
            </TooltipsProvider>
          </HelmetProvider>
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

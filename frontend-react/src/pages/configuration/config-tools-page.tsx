import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { useConfiguration } from '@/api/configurations';
import { PerformanceToolsCard } from './components/performance-tools-card';
import { ArrowLeft, Server, Loader2 } from 'lucide-react';
import { ContentLoader } from '@/components/common/content-loader';
import { Suspense } from 'react';

function ConfigToolsPageContent() {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading } = useConfiguration(configId ?? '');

  if (!configId) {
    navigate('/configuration');
    return null;
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <Container>
      <div className="space-y-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/configuration')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Configurations
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{config.name}</h1>
            <p className="text-sm text-muted-foreground">Performance Tools</p>
          </div>
        </div>

        <PerformanceToolsCard configId={configId} />
      </div>
    </Container>
  );
}

export function ConfigToolsPage() {
  return (
    <Suspense fallback={<ContentLoader />}>
      <ConfigToolsPageContent />
    </Suspense>
  );
}

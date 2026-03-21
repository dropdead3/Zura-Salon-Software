import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PixelZMark } from '@/components/ui/PixelZMark';
import { PLATFORM_NAME } from '@/lib/brand';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

function ErrorFallback({
  error,
  onReload,
  onGoHome,
}: {
  error?: Error;
  onReload: () => void;
  onGoHome: () => void;
}) {
  const message = error?.message?.trim() || 'A rendering error occurred.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 rounded-2xl border border-border/50 bg-card/40 px-8 py-7">
          <PixelZMark className="mx-auto" />
        </div>

        <h1 className="font-display text-xl tracking-[0.16em] uppercase">
          Unexpected interruption
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          {PLATFORM_NAME} encountered a rendering issue. Your data is safe. Reload to resume, or return to your dashboard.
        </p>

        <div className="mt-6">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Detail</p>
          <p className="mt-1 max-w-xl text-sm text-foreground/80">{message}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={onGoHome}>
            Go home
          </Button>
          <Button onClick={onReload}>Reload</Button>
        </div>

        {import.meta.env.DEV && error?.stack && (
          <pre className="mt-10 w-full overflow-auto rounded-xl border border-border/50 bg-muted/30 p-4 text-left text-xs text-muted-foreground">
            {error.stack}
          </pre>
        )}
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign('/dashboard');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ErrorFallback
        error={this.state.error}
        onReload={this.handleReload}
        onGoHome={this.handleGoHome}
      />
    );
  }
}

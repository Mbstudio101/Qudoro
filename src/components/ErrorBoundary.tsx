import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import Button from './ui/Button';

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unexpected error',
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('UI crash captured by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-4 text-center">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The app recovered from a runtime error. Reload to continue.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-destructive break-words">{this.state.errorMessage}</p>
            )}
            <Button type="button" onClick={this.handleReload} className="w-full">
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

'use client';

import { Component, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for React Query errors
 * Catches errors in child components and displays a fallback UI
 */
export class QueryErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Query Error Boundary caught an error:', error, errorInfo);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.reset);
            }

            return (
                <div className="container mx-auto px-4 py-8">
                    <Card className="max-w-2xl mx-auto border-destructive">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-5 h-5" />
                                Algo salió mal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Ha ocurrido un error al cargar los datos. Por favor, intenta de nuevo.
                            </p>

                            {process.env.NODE_ENV === 'development' && (
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm font-mono text-destructive">
                                        {this.state.error.message}
                                    </p>
                                    {this.state.error.stack && (
                                        <pre className="text-xs mt-2 overflow-auto max-h-40">
                                            {this.state.error.stack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <Button onClick={this.reset} className="w-full">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reintentar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Simplified error fallback component
 */
export function ErrorFallback({
    error,
    reset
}: {
    error: Error;
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error al cargar datos</h2>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
                {error.message || 'Ha ocurrido un error inesperado'}
            </p>
            <Button onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
            </Button>
        </div>
    );
}

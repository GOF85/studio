'use client';

import { usePageLoading } from '@/hooks/use-page-loading';
import { ProgressBar } from '@/components/ui/progress-bar';

export function GlobalLoadingIndicator() {
    const { isLoading, progress } = usePageLoading();

    if (!isLoading) return null;

    return <ProgressBar progress={progress} />;
}

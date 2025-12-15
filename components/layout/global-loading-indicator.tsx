'use client';


import { usePageLoading } from '@/hooks/use-page-loading';
import { ProgressBar } from '@/components/ui/progress-bar';

export function GlobalLoadingIndicator() {
    const { isLoading, progress } = usePageLoading();

    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <ProgressBar progress={progress} />
        </div>
    );
}

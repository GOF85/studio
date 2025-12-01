'use client';

import { usePageLoading } from '@/hooks/use-page-loading';
import { ProgressBar } from '@/components/ui/progress-bar';

export function GlobalLoadingIndicator() {
    const { isLoading, progress, loadingMessage } = usePageLoading();

    if (!isLoading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <div className="text-center text-xs text-gray-500 bg-white dark:bg-gray-800 py-1">
                {loadingMessage}
            </div>
            <ProgressBar progress={progress} />
        </div>
    );
}

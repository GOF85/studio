'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function usePageLoading() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Simulate page loading progress
        if (isLoading) {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            return () => clearInterval(interval);
        }
    }, [isLoading]);

    useEffect(() => {
        // Start loading
        setIsLoading(true);
        setProgress(0);

        // Complete loading
        const timeout = setTimeout(() => {
            setProgress(100);
            setTimeout(() => {
                setIsLoading(false);
            }, 300);
        }, 500);

        return () => clearTimeout(timeout);
    }, [pathname, searchParams]);

    return { isLoading, progress };
}

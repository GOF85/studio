'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PullToRefreshOptions {
    onRefresh?: () => Promise<void> | void;
    threshold?: number; // Distance in pixels to trigger refresh
}

export function usePullToRefresh({ onRefresh, threshold = 150 }: PullToRefreshOptions = {}) {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const router = useRouter();

    useEffect(() => {
        let startY = 0;
        let currentY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                setIsPulling(true);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0 && window.scrollY === 0) {
                // Resistance effect
                setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
                // Prevent default standard browser refresh if specific criteria met (careful with this)
                if (diff > 10) e.preventDefault();
            } else {
                setPullDistance(0);
                setIsPulling(false);
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling) return;

            if (pullDistance > threshold) {
                // Trigger refresh
                if (onRefresh) {
                    await onRefresh();
                } else {
                    router.refresh();
                }
            }

            // Reset
            setPullDistance(0);
            setIsPulling(false);
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false }); // non-passive to allow preventDefault
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isPulling, pullDistance, onRefresh, router, threshold]);

    return { isPulling, pullDistance };
}

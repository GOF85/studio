'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface PullToRefreshOptions {
    onRefresh?: () => Promise<void> | void;
    threshold?: number;
    disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 100, disabled = false }: PullToRefreshOptions = {}) {
    const router = useRouter();
    const startYRef = useRef(0);
    const pullDistanceRef = useRef(0);
    const isPullingRef = useRef(false);
    const isRefreshingRef = useRef(false);

    const triggerRefresh = useCallback(async () => {
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;

        if (onRefresh) {
            await onRefresh();
        } else {
            router.refresh();
        }

        isRefreshingRef.current = false;
    }, [onRefresh, router]);

    useEffect(() => {
        if (disabled) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only start if we're at the very top of the page
            if (window.scrollY <= 0 && !isRefreshingRef.current) {
                startYRef.current = e.touches[0].clientY;
                isPullingRef.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPullingRef.current || isRefreshingRef.current) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startYRef.current;

            // Only trigger if scrolled to top AND pulling DOWN (positive diff)
            if (diff > 0 && window.scrollY <= 0) {
                pullDistanceRef.current = diff;
                // Prevent default browser pull-to-refresh only after significant pull
                if (diff > 20) {
                    e.preventDefault();
                }
            } else {
                // Reset if scrolling up or not at top
                pullDistanceRef.current = 0;
                isPullingRef.current = false;
            }
        };

        const handleTouchEnd = () => {
            if (!isPullingRef.current) return;

            if (pullDistanceRef.current > threshold && !isRefreshingRef.current) {
                triggerRefresh();
            }

            // Reset
            pullDistanceRef.current = 0;
            isPullingRef.current = false;
            startYRef.current = 0;
        };

        // Use capture phase and check target to avoid interfering with other components
        const options = { passive: false, capture: true };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, options);
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [disabled, threshold, triggerRefresh]);

    return { isRefreshing: isRefreshingRef.current };
}

'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
    value?: number;
    onChange?: (value: number) => void;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    readonly?: boolean;
    className?: string;
}

export function RatingStars({
    value = 0,
    onChange,
    max = 5,
    size = 'md',
    readonly = false,
    className,
}: RatingStarsProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const handleClick = (rating: number) => {
        if (!readonly && onChange) {
            onChange(rating);
        }
    };

    return (
        <div className={cn('flex gap-1', className)}>
            {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
                <button
                    key={rating}
                    type="button"
                    onClick={() => handleClick(rating)}
                    disabled={readonly}
                    className={cn(
                        'transition-all',
                        !readonly && 'hover:scale-110 cursor-pointer',
                        readonly && 'cursor-default'
                    )}
                >
                    <Star
                        className={cn(
                            sizeClasses[size],
                            'transition-colors',
                            rating <= value
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-transparent text-gray-300'
                        )}
                    />
                </button>
            ))}
        </div>
    );
}

'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string;
  fallbackSrc?: string;
  containerClassName?: string;
  isAvatar?: boolean;
  forceNative?: boolean;
}

/**
 * Optimized Image component with fallback and lazy loading
 * - Uses next/image for optimization
 * - Supports AVIF/WebP formats
 * - Has error fallback
 * - Lazy loads with blur placeholder
 */
export function OptimizedImage({
  alt,
  fallbackSrc,
  containerClassName,
  isAvatar = false,
  className,
  forceNative = false,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const src = error && fallbackSrc ? fallbackSrc : (props.src as string);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/20 animate-pulse',
        !isLoading && 'animate-none',
        containerClassName
      )}
    >
      {forceNative ? (
        // Use native img when requested (e.g., public Supabase urls)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={cn('object-cover w-full h-full', className)} onError={() => setError(true)} onLoad={() => setIsLoading(false)} />
      ) : (
        <Image
          {...props}
          src={src}
          alt={alt}
          className={cn('object-cover', className)}
          onError={() => setError(true)}
          onLoadingComplete={() => setIsLoading(false)}
          priority={false}
          placeholder={isAvatar ? 'empty' : 'blur'}
          blurDataURL={
            isAvatar
              ? undefined
              : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VmZWZmMCIvPjwvc3ZnPg=='
          }
        />
      )}
    </div>
  );
}

export default OptimizedImage;

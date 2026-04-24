'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | undefined;
  height?: number | undefined;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality = 75,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      setIsLoading(false);
      onLoad?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Check if image is already loaded
    if (img.complete) {
      handleLoad();
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [onLoad, onError]);

  if (hasError) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}
        style={{ width, height }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {(() => {
        const imageProps: any = {
          src,
          alt,
          priority,
          placeholder,
          blurDataURL,
          sizes,
          quality,
          className: cn('transition-opacity duration-300', isLoading ? 'opacity-0' : 'opacity-100'),
          onError: () => {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          },
          onLoad: () => {
            setIsLoading(false);
            onLoad?.();
          },
        };

        if (width !== undefined) imageProps.width = width;
        if (height !== undefined) imageProps.height = height;

        return <Image {...imageProps} />;
      })()}
    </div>
  );
}

// Lazy loaded image component for below-the-fold content
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  rootMargin = '200px',
  ...props
}: OptimizedImageProps & { rootMargin?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [rootMargin]);

  if (!isVisible) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-muted animate-pulse', className)}
        style={{ width, height }}
      />
    );
  }

  const imageProps = {
    src,
    alt,
    className,
    ...props,
  };

  if (width !== undefined) (imageProps as any).width = width;
  if (height !== undefined) (imageProps as any).height = height;

  return <OptimizedImage {...(imageProps as OptimizedImageProps)} />;
}

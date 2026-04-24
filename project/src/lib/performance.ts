import { ComponentType, Suspense, createElement, lazy } from 'react';
import { Skeleton } from '../components/ui/Skeleton';

/**
 * Create a lazy-loaded page component with a loading fallback
 */
export function lazyPage<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string
) {
  const Component = lazy(importFunc);

  const fallback = createElement(
    'div',
    { className: 'space-y-6 fade-in p-6' },
    createElement(
      'div',
      { className: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4' },
      Array.from({ length: 4 }).map((_, i) =>
        createElement(
          'div',
          { key: i, className: 'card-premium space-y-3 rounded-2xl p-5' },
          createElement(Skeleton, { className: 'h-10 w-10' }),
          createElement(Skeleton, { className: 'h-8 w-24' }),
          createElement(Skeleton, { className: 'h-4 w-32' })
        )
      )
    ),
    createElement(Skeleton, { className: 'h-64 w-full' }),
    createElement(
      'div',
      { className: 'grid grid-cols-1 gap-5 lg:grid-cols-2' },
      createElement(Skeleton, { className: 'h-56 w-full' }),
      createElement(Skeleton, { className: 'h-56 w-full' })
    )
  );

  function LazyPageWrapper(props: P) {
    return createElement(
      Suspense,
      { fallback },
      createElement(Component, props as never)
    );
  }

  if (displayName) {
    LazyPageWrapper.displayName = displayName;
  }

  return LazyPageWrapper;
}

/**
 * Performance observer hook to measure render times
 */
export function useMeasureRender(componentName: string) {
  const measure = (callback: () => void) => {
    if (typeof performance === 'undefined' || !performance.mark) {
      callback();
      return;
    }

    const markName = `${componentName}-render`;
    performance.mark(`${markName}-start`);

    callback();

    performance.mark(`${markName}-end`);
    try {
      performance.measure(markName, `${markName}-start`, `${markName}-end`);
    } catch {
      // Ignore measurement errors in development
    }
  };

  return measure;
}

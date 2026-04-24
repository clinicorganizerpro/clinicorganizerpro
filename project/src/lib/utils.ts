/**
 * Utility functions for common operations across the application
 */

/**
 * Format a number as Brazilian currency (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(date: string, locale = 'pt-BR'): string {
  try {
    return new Date(date).toLocaleDateString(locale);
  } catch {
    return date;
  }
}

/**
 * Format time string (HH:MM)
 */
export function formatTime(time: string): string {
  if (!time || time.length < 5) return time;
  return time.substring(0, 5);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/**
 * Calculate days until a date
 */
export function daysUntil(dateString: string): number {
  const today = new Date();
  const date = new Date(dateString);
  const diffMs = date.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Debounce function for performance optimization
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Memoize function results based on arguments
 */
export function memoize<Args extends unknown[], Result>(
  func: (...args: Args) => Result
): (...args: Args) => Result {
  const cache = new Map<string, Result>();

  return (...args: Args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as Result;
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get nested property value from object
 */
export function getNestedValue(obj: unknown, path: string): unknown;
export function getNestedValue<T>(obj: unknown, path: string, fallback: T): T;
export function getNestedValue(obj: unknown, path: string, fallback?: unknown): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current !== null &&
      typeof current === 'object' &&
      key in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }

  return current;
}

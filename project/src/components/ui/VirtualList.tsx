import React, { memo, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string;
  emptyMessage?: string;
  maxItems?: number;
}

/**
 * Optimized list component that can handle pagination and large datasets
 * Currently renders all items but can be extended with virtual scrolling
 */
const VirtualListComponent = <T extends any>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  itemClassName = '',
  emptyMessage = 'Nenhum item encontrado',
  maxItems,
}: VirtualListProps<T>) => {
  const displayItems = useMemo(
    () => (maxItems ? items.slice(0, maxItems) : items),
    [items, maxItems]
  );

  if (displayItems.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-zinc-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {displayItems.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent;

/**
 * Paginated list component for better performance with large datasets
 */
interface PaginatedListProps<T> extends Omit<VirtualListProps<T>, 'maxItems'> {
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

const PaginatedListComponent = <T extends any>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  itemClassName = '',
  emptyMessage = 'Nenhum item encontrado',
  pageSize = 10,
  currentPage = 0,
  onPageChange,
}: PaginatedListProps<T>) => {
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const displayItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-zinc-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className={className}>
        {displayItems.map((item, index) => (
          <div key={keyExtractor(item, startIndex + index)} className={itemClassName}>
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-500">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export const PaginatedList = memo(PaginatedListComponent) as typeof PaginatedListComponent;

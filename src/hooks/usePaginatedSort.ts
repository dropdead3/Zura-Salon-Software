import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UsePaginatedSortOptions<T> {
  data: T[];
  defaultPageSize?: number;
  defaultSortField?: keyof T & string;
  defaultSortDirection?: SortDirection;
}

export interface UsePaginatedSortReturn<T> {
  paginatedData: T[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  sortField: string | null;
  sortDirection: SortDirection;
  toggleSort: (field: keyof T & string) => void;
  showingFrom: number;
  showingTo: number;
}

export function usePaginatedSort<T>({
  data,
  defaultPageSize = 25,
  defaultSortField,
  defaultSortDirection = 'desc',
}: UsePaginatedSortOptions<T>): UsePaginatedSortReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(defaultSortField ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortField, sortDirection]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / defaultPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * defaultPageSize;
    return sortedData.slice(start, start + defaultPageSize);
  }, [sortedData, safePage, defaultPageSize]);

  const toggleSort = (field: keyof T & string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const showingFrom = totalItems === 0 ? 0 : (safePage - 1) * defaultPageSize + 1;
  const showingTo = Math.min(safePage * defaultPageSize, totalItems);

  return {
    paginatedData,
    currentPage: safePage,
    setCurrentPage,
    pageSize: defaultPageSize,
    totalPages,
    totalItems,
    sortField,
    sortDirection,
    toggleSort,
    showingFrom,
    showingTo,
  };
}

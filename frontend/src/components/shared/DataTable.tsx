import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle filtering
  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  // Apply sorting and filtering
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const column = columns.find((col) => col.key === key);
        if (column) {
          result = result.filter((row) => {
            const cellValue = column.accessor(row);
            return String(cellValue).toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      const column = columns.find((col) => col.key === sortColumn);
      if (column) {
        result.sort((a, b) => {
          const aValue = String(column.accessor(a));
          const bValue = String(column.accessor(b));
          
          if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        });
      }
    }

    return result;
  }, [data, columns, filters, sortColumn, sortDirection]);

  const renderSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="h-4 w-4 text-blue-600" />;
    }
    return <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  const totalPages = pagination ? Math.ceil(pagination.totalItems / pagination.pageSize) : 1;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="hover:bg-gray-100 rounded p-1 transition-colors"
                        aria-label={`Sort by ${column.header}`}
                      >
                        {renderSortIcon(column.key)}
                      </button>
                    )}
                  </div>
                  {column.filterable && (
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={filters[column.key] || ''}
                          onChange={(e) => handleFilterChange(column.key, e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } transition-colors`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {(pagination.page - 1) * pagination.pageSize + 1}-
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
              {pagination.totalItems}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

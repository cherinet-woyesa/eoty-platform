import { useState, useMemo } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { TableSkeleton } from '@/components/shared/LoadingStates';

export interface ConfigTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ConfigTableProps<T> {
  columns: ConfigTableColumn[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onToggleActive?: (item: T) => void;
  onViewUsage?: (item: T) => void;
  selectable?: boolean;
  selectedItems?: Set<number>;
  onSelectionChange?: (selectedIds: Set<number>) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function ConfigTable<T extends { id: number; is_active?: boolean; usage_count?: number }>({
  columns,
  data,
  isLoading = false,
  onEdit,
  onDelete,
  onToggleActive,
  onViewUsage,
  selectable = false,
  selectedItems = new Set(),
  onSelectionChange,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
}: ConfigTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortColumn];
        const bValue = (b as any)[sortColumn];

        if (aValue === bValue) return 0;

        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(processedData.map(item => item.id));
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.(new Set());
    }
  };

  // Handle select item
  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange?.(newSelection);
  };

  const allSelected = processedData.length > 0 && processedData.every(item => selectedItems.has(item.id));
  const someSelected = processedData.some(item => selectedItems.has(item.id)) && !allSelected;

  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length + (selectable ? 1 : 0) + 1} />;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Selection Column */}
              {selectable && (
                <th className="px-6 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-[#27AE60] rounded border-gray-300 focus:ring-[#27AE60]"
                  />
                </th>
              )}

              {/* Data Columns */}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && sortColumn === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}

              {/* Actions Column */}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + 1}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {/* Selection Cell */}
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="h-4 w-4 text-[#27AE60] rounded border-gray-300 focus:ring-[#27AE60]"
                      />
                    </td>
                  )}

                  {/* Data Cells */}
                  {columns.map(column => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                      {column.render
                        ? column.render((item as any)[column.key], item)
                        : (item as any)[column.key]}
                    </td>
                  ))}

                  {/* Actions Cell */}
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* View Usage */}
                      {onViewUsage && item.usage_count !== undefined && (
                        <button
                          onClick={() => onViewUsage(item)}
                          className="p-1 text-gray-400 hover:text-[#27AE60] transition-colors"
                          title={`View usage (${item.usage_count} courses)`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      )}

                      {/* Toggle Active */}
                      {onToggleActive && item.is_active !== undefined && (
                        <button
                          onClick={() => onToggleActive(item)}
                          className={`p-1 transition-colors ${
                            item.is_active
                              ? 'text-[#27AE60] hover:text-[#219150]'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title={item.is_active ? 'Active' : 'Inactive'}
                        >
                          {item.is_active ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {/* Edit */}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1 text-gray-400 hover:text-[#27AE60] transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete */}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                          disabled={item.usage_count !== undefined && item.usage_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      {processedData.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          Showing {processedData.length} of {data.length} items
          {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
        </div>
      )}
    </div>
  );
}

// Helper components for common column renders
export const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active
        ? 'bg-[#27AE60]/10 text-[#27AE60]'
        : 'bg-gray-100 text-gray-800'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

export const UsageBadge: React.FC<{ count: number }> = ({ count }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      count === 0
        ? 'bg-gray-100 text-gray-600'
        : 'bg-[#27AE60]/10 text-[#27AE60]'
    }`}
    title={`Used by ${count} course${count !== 1 ? 's' : ''}`}
  >
    {count}
  </span>
);

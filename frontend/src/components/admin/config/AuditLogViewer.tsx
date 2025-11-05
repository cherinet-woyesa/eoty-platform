import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  User,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { getAuditLogs } from '../../../services/api/systemConfig';
import type { ConfigAuditLog, AuditLogFilters } from '../../../types/systemConfig';
import { TableSkeleton } from '../../shared/LoadingStates';
import { apiClient } from '../../../services/api/apiClient';

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: number;
}

export function AuditLogViewer({ entityType, entityId }: AuditLogViewerProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    entity_type: entityType,
    entity_id: entityId,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [adminSearch, setAdminSearch] = useState('');
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);

  // Fetch admin users for filtering
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const response = await apiClient.get('/admin/users', {
          params: { role: 'admin' }
        });
        const users = response.data.users || [];
        setAdminUsers(users.map((u: any) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
          email: u.email
        })));
      } catch (error) {
        console.error('Error fetching admin users:', error);
      }
    };
    fetchAdminUsers();
  }, []);

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => getAuditLogs(filters),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  // Filter admin users based on search
  const filteredAdminUsers = adminUsers.filter(admin =>
    admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    admin.email.toLowerCase().includes(adminSearch.toLowerCase())
  );

  // Get selected admin name
  const selectedAdmin = adminUsers.find(admin => admin.id === filters.admin_id);

  // Toggle expanded state for a log entry
  const toggleExpanded = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Get action badge color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'activate':
        return 'bg-emerald-100 text-emerald-800';
      case 'deactivate':
        return 'bg-gray-100 text-gray-800';
      case 'reorder':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle admin selection
  const handleAdminSelect = (adminId: number) => {
    handleFilterChange('admin_id', adminId);
    setShowAdminDropdown(false);
    setAdminSearch('');
  };

  // Clear admin filter
  const clearAdminFilter = () => {
    handleFilterChange('admin_id', undefined);
    setAdminSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Header with filters toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
          <span className="text-sm text-gray-500">({total} entries)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Admin User Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin User
              </label>
              {selectedAdmin ? (
                <div className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-sm text-gray-900 truncate">
                    {selectedAdmin.name}
                  </span>
                  <button
                    onClick={clearAdminFilter}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    title="Clear admin filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search admin users..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      onFocus={() => setShowAdminDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAdminDropdown(false), 200)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {showAdminDropdown && filteredAdminUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredAdminUsers.map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => handleAdminSelect(admin.id)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                          <div className="text-xs text-gray-500">{admin.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Entity Type Filter */}
            {!entityType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={filters.entity_type || ''}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="category">Category</option>
                  <option value="level">Level</option>
                  <option value="duration">Duration</option>
                  <option value="tag">Tag</option>
                  <option value="chapter">Chapter</option>
                </select>
              </div>
            )}

            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={filters.action_type || ''}
                onChange={(e) => handleFilterChange('action_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="reorder">Reorder</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filters.start_date || filters.end_date || filters.admin_id || filters.entity_type || filters.action_type) && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {filters.start_date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  From: {filters.start_date}
                  <button
                    onClick={() => handleFilterChange('start_date', undefined)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.end_date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  To: {filters.end_date}
                  <button
                    onClick={() => handleFilterChange('end_date', undefined)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.admin_id && selectedAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  Admin: {selectedAdmin.name}
                  <button
                    onClick={clearAdminFilter}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.entity_type && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                  Type: {filters.entity_type}
                  <button
                    onClick={() => handleFilterChange('entity_type', undefined)}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.action_type && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                  Action: {filters.action_type}
                  <button
                    onClick={() => handleFilterChange('action_type', undefined)}
                    className="hover:text-orange-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20, entity_type: entityType, entity_id: entityId });
                setAdminSearch('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Log List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <AuditLogEntry
              key={log.id}
              log={log}
              isExpanded={expandedLogs.has(log.id)}
              onToggleExpand={() => toggleExpanded(log.id)}
              formatTimestamp={formatTimestamp}
              getActionColor={getActionColor}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-700">
            Showing page {filters.page} of {pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(filters.page! - 1)}
              disabled={filters.page === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(filters.page! + 1)}
              disabled={filters.page === pages}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Audit Log Entry Component
interface AuditLogEntryProps {
  log: ConfigAuditLog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatTimestamp: (timestamp: string) => string;
  getActionColor: (action: string) => string;
}

function AuditLogEntry({
  log,
  isExpanded,
  onToggleExpand,
  formatTimestamp,
  getActionColor,
}: AuditLogEntryProps) {
  const hasChanges = log.before_state || log.after_state;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Header Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action_type)}`}>
                {log.action_type.toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)} #{log.entity_id}
              </span>
            </div>

            {/* Admin Info */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="font-medium">{log.admin_name}</span>
              <span className="text-gray-400">({log.admin_email})</span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatTimestamp(log.created_at)}</span>
            </div>
          </div>

          {/* Expand Button */}
          {hasChanges && (
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? 'Hide changes' : 'Show changes'}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Expanded Changes View */}
        {isExpanded && hasChanges && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ChangesDiffView
              beforeState={log.before_state}
              afterState={log.after_state}
              actionType={log.action_type}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Changes Diff View Component
interface ChangesDiffViewProps {
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  actionType: string;
}

function ChangesDiffView({ beforeState, afterState, actionType }: ChangesDiffViewProps) {
  // Get all unique keys from both states
  const allKeys = new Set([
    ...Object.keys(beforeState || {}),
    ...Object.keys(afterState || {}),
  ]);

  // Filter out keys we don't want to show
  const keysToShow = Array.from(allKeys).filter(
    key => !['id', 'created_at', 'updated_at', 'created_by'].includes(key)
  );

  // Format value for display with proper JSON formatting
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      // Pretty print JSON with proper indentation
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  };

  // Check if value is a complex object (not primitive)
  const isComplexValue = (value: any): boolean => {
    return value !== null && 
           value !== undefined && 
           typeof value === 'object' && 
           (Array.isArray(value) || Object.keys(value).length > 0);
  };

  // Check if value changed
  const hasChanged = (key: string): boolean => {
    if (!beforeState || !afterState) return false;
    return JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key]);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">Changes</h4>
      
      {actionType === 'create' && afterState && (
        <div className="space-y-2">
          {keysToShow.map(key => {
            const isComplex = isComplexValue(afterState[key]);
            return (
              <div key={key} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-medium text-green-900">{key}</div>
                  {isComplex && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      JSON
                    </span>
                  )}
                </div>
                <div className={`text-sm text-green-800 font-mono whitespace-pre-wrap break-all ${
                  isComplex ? 'bg-white bg-opacity-50 p-2 rounded border border-green-300' : ''
                }`}>
                  {formatValue(afterState[key])}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionType === 'delete' && beforeState && (
        <div className="space-y-2">
          {keysToShow.map(key => {
            const isComplex = isComplexValue(beforeState[key]);
            return (
              <div key={key} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-medium text-red-900">{key}</div>
                  {isComplex && (
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded">
                      JSON
                    </span>
                  )}
                </div>
                <div className={`text-sm text-red-800 font-mono whitespace-pre-wrap break-all line-through ${
                  isComplex ? 'bg-white bg-opacity-50 p-2 rounded border border-red-300' : ''
                }`}>
                  {formatValue(beforeState[key])}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionType === 'update' && beforeState && afterState && (
        <div className="space-y-2">
          {keysToShow.map(key => {
            const changed = hasChanged(key);
            const isComplexBefore = isComplexValue(beforeState[key]);
            const isComplexAfter = isComplexValue(afterState[key]);
            const isComplex = isComplexBefore || isComplexAfter;
            
            return (
              <div
                key={key}
                className={`rounded-lg p-3 ${
                  changed
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`flex items-center gap-2 mb-2 ${
                  changed ? 'text-yellow-900' : 'text-gray-700'
                }`}>
                  <div className="text-xs font-medium">
                    {key}
                  </div>
                  {changed && (
                    <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded font-semibold">
                      CHANGED
                    </span>
                  )}
                  {isComplex && (
                    <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                      JSON
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                      Before
                    </div>
                    <div className={`text-sm font-mono whitespace-pre-wrap break-all ${
                      changed ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-100'
                    } ${isComplexBefore ? 'p-2 rounded border border-red-200' : 'p-1 rounded'}`}>
                      {formatValue(beforeState[key])}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      After
                    </div>
                    <div className={`text-sm font-mono whitespace-pre-wrap break-all ${
                      changed ? 'text-green-700 bg-green-50 font-semibold' : 'text-gray-700 bg-gray-100'
                    } ${isComplexAfter ? 'p-2 rounded border border-green-200' : 'p-1 rounded'}`}>
                      {formatValue(afterState[key])}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(actionType === 'activate' || actionType === 'deactivate' || actionType === 'reorder') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            {actionType === 'activate' && 'Entity was activated'}
            {actionType === 'deactivate' && 'Entity was deactivated'}
            {actionType === 'reorder' && beforeState && afterState && (
              <div>
                Display order changed from {beforeState.display_order} to {afterState.display_order}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock } from 'lucide-react';
import { systemConfigApi } from '@/services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/ConfigTable';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/UsageAnalytics';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { CourseDuration, DurationFormData } from '@/types/systemConfig';

export const DurationManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingDuration, setEditingDuration] = useState<CourseDuration | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<CourseDuration | null>(null);
  const [formData, setFormData] = useState<DurationFormData>({ 
    value: '', 
    label: '', 
    weeks_min: undefined, 
    weeks_max: undefined 
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch durations
  const { data: durationsRaw = [], isLoading } = useQuery({
    queryKey: ['durations'],
    queryFn: () => systemConfigApi.getDurations(false),
  });

  // Sort durations by weeks_min ascending (automatic sorting)
  const durations = useMemo(() => {
    return [...durationsRaw].sort((a, b) => {
      const aMin = a.weeks_min ?? Infinity;
      const bMin = b.weeks_min ?? Infinity;
      return aMin - bMin;
    });
  }, [durationsRaw]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: systemConfigApi.createDuration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['durations'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setIsCreating(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Duration created successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create duration',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DurationFormData> & { is_active?: boolean } }) =>
      systemConfigApi.updateDuration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['durations'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setEditingDuration(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Duration updated successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update duration',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: systemConfigApi.deleteDuration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['durations'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Duration deleted successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete duration',
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: systemConfigApi.bulkActionDurations,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['durations'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setSelectedItems(new Set());
      
      if (result.failed > 0) {
        showNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${result.successful} succeeded, ${result.failed} failed`,
        });
      } else {
        showNotification({
          type: 'success',
          title: 'Success',
          message: `${result.successful} durations updated successfully`,
        });
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Bulk action failed',
      });
    },
  });

  // Form initialization
  const openCreateForm = () => {
    setFormData({ value: '', label: '', weeks_min: undefined, weeks_max: undefined });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (duration: CourseDuration) => {
    setFormData({
      value: duration.value,
      label: duration.label,
      weeks_min: duration.weeks_min,
      weeks_max: duration.weeks_max,
    });
    setFormErrors({});
    setEditingDuration(duration);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingDuration(null);
    setFormData({ value: '', label: '', weeks_min: undefined, weeks_max: undefined });
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate value format (e.g., "1-2", "9+")
    if (!formData.value || formData.value.trim().length === 0) {
      errors.value = 'Duration value is required';
    } else if (!/^(\d+-\d+|\d+\+)$/.test(formData.value.trim())) {
      errors.value = 'Value must be in format "1-2" or "9+"';
    }

    // Validate label
    if (!formData.label || formData.label.trim().length < 5) {
      errors.label = 'Label must be at least 5 characters';
    } else if (formData.label.length > 30) {
      errors.label = 'Label must be less than 30 characters';
    }

    // Validate weeks_min and weeks_max
    if (formData.weeks_min !== undefined && formData.weeks_min < 0) {
      errors.weeks_min = 'Minimum weeks must be 0 or greater';
    }

    if (formData.weeks_max !== undefined && formData.weeks_max < 0) {
      errors.weeks_max = 'Maximum weeks must be 0 or greater';
    }

    if (
      formData.weeks_min !== undefined && 
      formData.weeks_max !== undefined && 
      formData.weeks_min > formData.weeks_max
    ) {
      errors.weeks_max = 'Maximum weeks must be greater than or equal to minimum weeks';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors before saving',
      });
      return;
    }

    try {
      if (isCreating) {
        await createMutation.mutateAsync(formData);
      } else if (editingDuration) {
        await updateMutation.mutateAsync({ id: editingDuration.id, data: formData });
      }
      closeForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (duration: CourseDuration) => {
    if (duration.usage_count > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Delete',
        message: `This duration is used by ${duration.usage_count} course(s)`,
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Duration',
      message: `Are you sure you want to delete "${duration.label}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(duration.id);
    }
  };

  const handleToggleActive = async (duration: CourseDuration) => {
    await updateMutation.mutateAsync({
      id: duration.id,
      data: { is_active: !duration.is_active },
    });
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      const durationsWithUsage = durations.filter(
        d => ids.includes(d.id) && d.usage_count > 0
      );
      
      if (durationsWithUsage.length > 0) {
        showNotification({
          type: 'error',
          title: 'Cannot Delete',
          message: `${durationsWithUsage.length} selected durations are in use`,
        });
        throw new Error('Cannot delete durations in use');
      }
    }

    return await bulkActionMutation.mutateAsync({ action, ids });
  };

  // Format week range for display
  const formatWeekRange = (duration: CourseDuration) => {
    if (duration.weeks_min !== undefined && duration.weeks_max !== undefined) {
      return `${duration.weeks_min}-${duration.weeks_max} weeks`;
    } else if (duration.weeks_min !== undefined) {
      return `${duration.weeks_min}+ weeks`;
    }
    return '—';
  };

  // Table columns
  const columns: ConfigTableColumn[] = [
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      width: '15%',
      render: (value) => (
        <span className="font-mono font-medium text-blue-600">{value}</span>
      ),
    },
    {
      key: 'label',
      label: 'Label',
      sortable: true,
      width: '25%',
      render: (value) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'weeks_min',
      label: 'Week Range',
      sortable: false,
      width: '20%',
      render: (_, row: CourseDuration) => (
        <span className="text-gray-600">{formatWeekRange(row)}</span>
      ),
    },
    {
      key: 'usage_count',
      label: 'Usage',
      sortable: true,
      width: '15%',
      render: (value) => <UsageBadge count={value} />,
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      width: '15%',
      render: (value) => <StatusBadge active={value} />,
    },
  ];

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={openCreateForm}
            className="bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white px-4 py-2 rounded-lg font-medium hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Duration
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <BulkActionBar
            selectedCount={selectedItems.size}
            onClearSelection={() => setSelectedItems(new Set())}
            onActivate={() => handleBulkAction('activate')}
            onDeactivate={() => handleBulkAction('deactivate')}
            onDelete={() => handleBulkAction('delete')}
            entityName="duration"
          />
        )}

        {/* Table */}
        <ConfigTable
          columns={columns}
          data={durations}
          isLoading={isLoading}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewUsage={setViewingUsage}
          selectable
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          searchPlaceholder="Search durations..."
          emptyMessage="No durations found. Create your first duration to get started."
        />

        {/* Create/Edit Modal */}
        {(isCreating || editingDuration) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#27AE60] to-[#16A085] px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? 'Create Duration' : 'Edit Duration'}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {isCreating ? 'Add a new duration option' : 'Update duration details'}
                      </p>
                    </div>
                    <button
                      onClick={closeForm}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Plus className="h-6 w-6 rotate-45" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Value Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration Value <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder='e.g., "1-2" or "9+"'
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                        formErrors.value ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.value && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.value}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Format: "1-2" for range or "9+" for open-ended
                    </p>
                  </div>

                  {/* Label Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g., 1-2 weeks"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.label ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.label && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.label}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      User-friendly label shown in dropdowns (5-30 characters)
                    </p>
                  </div>

                  {/* Week Range Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Weeks
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.weeks_min ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          weeks_min: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="e.g., 1"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.weeks_min ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.weeks_min && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.weeks_min}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Weeks
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.weeks_max ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          weeks_max: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="e.g., 2"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.weeks_max ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.weeks_max && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.weeks_max}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Optional: Specify the week range for sorting and filtering
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-6 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Usage Analytics Modal */}
        {viewingUsage && (
          <UsageAnalytics
            entityType="duration"
            entityId={viewingUsage.id}
            entityName={viewingUsage.label}
            onClose={() => setViewingUsage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default DurationManagement;

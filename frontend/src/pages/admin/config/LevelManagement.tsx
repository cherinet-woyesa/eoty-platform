import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { systemConfigApi } from '@/services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/ConfigTable';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/UsageAnalytics';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { CourseLevel, LevelFormData } from '@/types/systemConfig';

export const LevelManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingLevel, setEditingLevel] = useState<CourseLevel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<CourseLevel | null>(null);
  const [formData, setFormData] = useState<LevelFormData>({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch levels
  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: () => systemConfigApi.getLevels(false),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: systemConfigApi.createLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setIsCreating(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Level created successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create level',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LevelFormData> & { is_active?: boolean } }) =>
      systemConfigApi.updateLevel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setEditingLevel(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Level updated successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update level',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: systemConfigApi.deleteLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Level deleted successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete level',
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: systemConfigApi.bulkActionLevels,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
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
          message: `${result.successful} levels updated successfully`,
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

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: systemConfigApi.reorderLevels,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Levels reordered successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to reorder levels',
      });
    },
  });

  // Form initialization
  const openCreateForm = () => {
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (level: CourseLevel) => {
    setFormData({
      name: level.name,
      description: level.description || '',
    });
    setFormErrors({});
    setEditingLevel(level);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingLevel(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      errors.name = 'Level name must be at least 3 characters';
    } else if (formData.name.length > 30) {
      errors.name = 'Level name must be less than 30 characters';
    }

    if (!formData.description || formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 100) {
      errors.description = 'Description must be less than 100 characters';
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
      } else if (editingLevel) {
        await updateMutation.mutateAsync({ id: editingLevel.id, data: formData });
      }
      closeForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (level: CourseLevel) => {
    if (level.usage_count > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Delete',
        message: `This level is used by ${level.usage_count} course(s)`,
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Level',
      message: `Are you sure you want to delete "${level.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(level.id);
    }
  };

  const handleToggleActive = async (level: CourseLevel) => {
    // Check if this is the last active level
    const activeLevels = levels.filter(l => l.is_active);
    if (level.is_active && activeLevels.length === 1) {
      showNotification({
        type: 'error',
        title: 'Cannot Deactivate',
        message: 'At least one level must remain active',
      });
      return;
    }

    await updateMutation.mutateAsync({
      id: level.id,
      data: { is_active: !level.is_active },
    });
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      const levelsWithUsage = levels.filter(
        l => ids.includes(l.id) && l.usage_count > 0
      );
      
      if (levelsWithUsage.length > 0) {
        showNotification({
          type: 'error',
          title: 'Cannot Delete',
          message: `${levelsWithUsage.length} selected levels are in use`,
        });
        throw new Error('Cannot delete levels in use');
      }
    }

    if (action === 'deactivate') {
      // Check if deactivating would leave no active levels
      const activeLevels = levels.filter(l => l.is_active);
      const selectedActiveLevels = activeLevels.filter(l => ids.includes(l.id));
      
      if (selectedActiveLevels.length === activeLevels.length) {
        showNotification({
          type: 'error',
          title: 'Cannot Deactivate',
          message: 'At least one level must remain active',
        });
        throw new Error('Cannot deactivate all levels');
      }
    }

    return await bulkActionMutation.mutateAsync({ action, ids });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = levels.findIndex(l => l.id === active.id);
      const newIndex = levels.findIndex(l => l.id === over.id);

      const reordered = arrayMove(levels, oldIndex, newIndex);
      const items = reordered.map((level, index) => ({
        id: level.id,
        display_order: index,
      }));

      reorderMutation.mutate({ items });
    }
  };

  // Table columns
  const columns: ConfigTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '25%',
      render: (value) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      width: '40%',
      render: (value) => (
        <span className="text-gray-600 line-clamp-2">{value || '—'}</span>
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUp className="h-8 w-8" />
                Course Levels
              </h1>
              <p className="text-blue-100 mt-2">
                Manage difficulty levels that teachers can select when creating courses
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              New Level
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <BulkActionBar
            selectedCount={selectedItems.size}
            onClearSelection={() => setSelectedItems(new Set())}
            onActivate={() => handleBulkAction('activate')}
            onDeactivate={() => handleBulkAction('deactivate')}
            onDelete={() => handleBulkAction('delete')}
            entityName="level"
          />
        )}

        {/* Table */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={levels.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ConfigTable
              columns={columns}
              data={levels}
              isLoading={isLoading}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewUsage={setViewingUsage}
              selectable
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              searchPlaceholder="Search levels..."
              emptyMessage="No levels found. Create your first level to get started."
            />
          </SortableContext>
        </DndContext>

        {/* Create/Edit Modal */}
        {(isCreating || editingLevel) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? 'Create Level' : 'Edit Level'}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {isCreating ? 'Add a new difficulty level' : 'Update level details'}
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
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Beginner"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      A descriptive name for the difficulty level (3-30 characters)
                    </p>
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this difficulty level..."
                      rows={4}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Description to help teachers understand this level (10-100 characters)
                    </p>
                  </div>

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
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            entityType="level"
            entityId={viewingUsage.id}
            entityName={viewingUsage.name}
            onClose={() => setViewingUsage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default LevelManagement;

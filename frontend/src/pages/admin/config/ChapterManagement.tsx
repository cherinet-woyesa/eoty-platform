import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen } from 'lucide-react';
import { systemConfigApi } from '@/services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/system/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/system/ConfigTable';
import { BulkActionBar } from '@/components/admin/moderation/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/analytics/UsageAnalytics';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { Chapter, ChapterFormData } from '@/types/systemConfig';

export const ChapterManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState<ChapterFormData>({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch chapters
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => systemConfigApi.getChapters(false),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: systemConfigApi.createChapter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setIsCreating(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Chapter created successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create chapter',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChapterFormData> & { is_active?: boolean } }) =>
      systemConfigApi.updateChapter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setEditingChapter(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Chapter updated successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update chapter',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: systemConfigApi.deleteChapter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Chapter deleted successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete chapter',
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: systemConfigApi.bulkActionChapters,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
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
          message: `${result.successful} chapters updated successfully`,
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
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (chapter: Chapter) => {
    setFormData({
      name: chapter.name,
      description: chapter.description || '',
    });
    setFormErrors({});
    setEditingChapter(chapter);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingChapter(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      errors.name = 'Chapter name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Chapter name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
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
      } else if (editingChapter) {
        await updateMutation.mutateAsync({ id: editingChapter.id, data: formData });
      }
      closeForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (chapter: Chapter) => {
    if (chapter.course_count > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Delete',
        message: `This chapter contains ${chapter.course_count} course(s)`,
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Chapter',
      message: `Are you sure you want to delete "${chapter.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(chapter.id);
    }
  };

  const handleToggleActive = async (chapter: Chapter) => {
    await updateMutation.mutateAsync({
      id: chapter.id,
      data: { is_active: !chapter.is_active },
    });
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      const chaptersWithCourses = chapters.filter(
        c => ids.includes(c.id) && c.course_count > 0
      );
      
      if (chaptersWithCourses.length > 0) {
        showNotification({
          type: 'error',
          title: 'Cannot Delete',
          message: `${chaptersWithCourses.length} selected chapters contain courses`,
        });
        throw new Error('Cannot delete chapters with courses');
      }
    }

    return await bulkActionMutation.mutateAsync({ action, ids });
  };

  // Table columns
  const columns: ConfigTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '30%',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      width: '35%',
      render: (value) => (
        <span className="text-gray-600 line-clamp-2">{value || '—'}</span>
      ),
    },
    {
      key: 'course_count',
      label: 'Courses',
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
            New Chapter
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
            entityName="chapter"
          />
        )}

        {/* Table */}
        <ConfigTable
          columns={columns}
          data={chapters}
          isLoading={isLoading}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewUsage={setViewingUsage}
          selectable
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          searchPlaceholder="Search chapters..."
          emptyMessage="No chapters found. Create your first chapter to get started."
        />

        {/* Create/Edit Modal */}
        {(isCreating || editingChapter) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#27AE60] to-[#16A085] px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? 'Create Chapter' : 'Edit Chapter'}
                      </h2>
                      <p className="text-green-50 mt-1">
                        {isCreating ? 'Add a new chapter' : 'Update chapter details'}
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
                      Chapter Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Introduction to Catholic Faith"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Unique chapter name (3-100 characters)
                    </p>
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this chapter..."
                      rows={4}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent ${
                        formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Optional description (max 500 characters)
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
            entityType="chapter"
            entityId={viewingUsage.id}
            entityName={viewingUsage.name}
            onClose={() => setViewingUsage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ChapterManagement;

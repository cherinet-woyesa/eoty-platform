import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Shuffle } from 'lucide-react';
import { systemConfigApi } from '../../../services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '../../../components/admin/ConfigTable';
import type { ConfigTableColumn } from '../../../components/admin/ConfigTable';
import { BulkActionBar } from '../../../components/admin/BulkActionBar';
import { UsageAnalytics } from '../../../components/admin/UsageAnalytics';
import { useNotification } from '../../../context/NotificationContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import type { ContentTag, TagFormData } from '../../../types/systemConfig';

export const TagManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingTag, setEditingTag] = useState<ContentTag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<ContentTag | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TagFormData>({ name: '', category: '', color: '#3B82F6' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch tags sorted by usage
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', 'usage'],
    queryFn: () => systemConfigApi.getTags(false, 'usage'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: systemConfigApi.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setIsCreating(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Tag created successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create tag',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TagFormData> & { is_active?: boolean } }) =>
      systemConfigApi.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setEditingTag(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Tag updated successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update tag',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: systemConfigApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Tag deleted successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete tag',
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: systemConfigApi.bulkActionTags,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
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
          message: `${result.successful} tags updated successfully`,
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

  // Merge tags mutation
  const mergeTagsMutation = useMutation({
    mutationFn: systemConfigApi.mergeTags,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setShowMergeDialog(false);
      setMergeSourceId(null);
      setMergeTargetId(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Tags merged successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to merge tags',
      });
    },
  });

  // Form initialization
  const openCreateForm = () => {
    setFormData({ name: '', category: '', color: '#3B82F6' });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (tag: ContentTag) => {
    setFormData({
      name: tag.name,
      category: tag.category || '',
      color: tag.color || '#3B82F6',
    });
    setFormErrors({});
    setEditingTag(tag);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingTag(null);
    setFormData({ name: '', category: '', color: '#3B82F6' });
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Tag name must be at least 2 characters';
    } else if (formData.name.length > 30) {
      errors.name = 'Tag name must be less than 30 characters';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.name)) {
      errors.name = 'Tag name must be alphanumeric with hyphens only';
    }

    if (formData.category && formData.category.length > 50) {
      errors.category = 'Category must be less than 50 characters';
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
      } else if (editingTag) {
        await updateMutation.mutateAsync({ id: editingTag.id, data: formData });
      }
      closeForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (tag: ContentTag) => {
    if (tag.usage_count > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Delete',
        message: `This tag is used by ${tag.usage_count} course(s)`,
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Tag',
      message: `Are you sure you want to delete "${tag.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(tag.id);
    }
  };

  const handleToggleActive = async (tag: ContentTag) => {
    await updateMutation.mutateAsync({
      id: tag.id,
      data: { is_active: !tag.is_active },
    });
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      const tagsWithUsage = tags.filter(
        t => ids.includes(t.id) && t.usage_count > 0
      );
      
      if (tagsWithUsage.length > 0) {
        showNotification({
          type: 'error',
          title: 'Cannot Delete',
          message: `${tagsWithUsage.length} selected tags are in use`,
        });
        throw new Error('Cannot delete tags in use');
      }
    }

    return await bulkActionMutation.mutateAsync({ action, ids });
  };

  const handleMergeTags = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select both source and target tags',
      });
      return;
    }

    if (mergeSourceId === mergeTargetId) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Source and target tags must be different',
      });
      return;
    }

    const sourceTag = tags.find(t => t.id === mergeSourceId);
    const targetTag = tags.find(t => t.id === mergeTargetId);

    const confirmed = await confirm({
      title: 'Merge Tags',
      message: `Are you sure you want to merge "${sourceTag?.name}" into "${targetTag?.name}"? This will reassign all courses from the source tag to the target tag and delete the source tag.`,
      confirmLabel: 'Merge',
      variant: 'danger',
    });

    if (confirmed) {
      await mergeTagsMutation.mutateAsync({
        source_tag_id: mergeSourceId,
        target_tag_id: mergeTargetId,
      });
    }
  };

  // Render color badge
  const renderColorBadge = (color: string, name: string) => (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <span className="font-medium">{name}</span>
    </div>
  );

  // Table columns
  const columns: ConfigTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '25%',
      render: (value, row: ContentTag) => renderColorBadge(row.color, value),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      width: '20%',
      render: (value) => (
        <span className="text-gray-600">{value || '—'}</span>
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Tag className="h-8 w-8" />
                Content Tags
              </h1>
              <p className="text-blue-100 mt-2">
                Manage content tags for course categorization and filtering
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMergeDialog(true)}
                className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <Shuffle className="h-5 w-5" />
                Merge Tags
              </button>
              <button
                onClick={openCreateForm}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                New Tag
              </button>
            </div>
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
            entityName="tag"
          />
        )}

        {/* Table */}
        <ConfigTable
          columns={columns}
          data={tags}
          isLoading={isLoading}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewUsage={setViewingUsage}
          selectable
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          searchPlaceholder="Search tags..."
          emptyMessage="No tags found. Create your first tag to get started."
        />

        {/* Create/Edit Modal */}
        {(isCreating || editingTag) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? 'Create Tag' : 'Edit Tag'}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {isCreating ? 'Add a new content tag' : 'Update tag details'}
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
                      Tag Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., sacraments"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Alphanumeric with hyphens only (2-30 characters)
                    </p>
                  </div>

                  {/* Category Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Theology"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.category && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Optional category to group related tags (max 50 characters)
                    </p>
                  </div>

                  {/* Color Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color || '#3B82F6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color || '#3B82F6'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Color for tag badge display
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
            entityType="tag"
            entityId={viewingUsage.id}
            entityName={viewingUsage.name}
            onClose={() => setViewingUsage(null)}
          />
        )}

        {/* Merge Tags Dialog */}
        {showMergeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Shuffle className="h-6 w-6" />
                      Merge Tags
                    </h2>
                    <p className="text-blue-100 mt-1">
                      Combine two tags by reassigning all courses from source to target
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMergeDialog(false);
                      setMergeSourceId(null);
                      setMergeTargetId(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Plus className="h-6 w-6 rotate-45" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Source Tag Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Tag (will be deleted) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mergeSourceId || ''}
                    onChange={(e) => setMergeSourceId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select source tag...</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name} ({tag.usage_count} courses)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    All courses using this tag will be reassigned to the target tag
                  </p>
                </div>

                {/* Target Tag Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Tag (will receive courses) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mergeTargetId || ''}
                    onChange={(e) => setMergeTargetId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select target tag...</option>
                    {tags
                      .filter(tag => tag.id !== mergeSourceId)
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name} ({tag.usage_count} courses)
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    This tag will keep all its courses plus those from the source tag
                  </p>
                </div>

                {/* Preview */}
                {mergeSourceId && mergeTargetId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Merge Preview</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        • Source: <span className="font-medium">{tags.find(t => t.id === mergeSourceId)?.name}</span> ({tags.find(t => t.id === mergeSourceId)?.usage_count} courses)
                      </p>
                      <p>
                        • Target: <span className="font-medium">{tags.find(t => t.id === mergeTargetId)?.name}</span> ({tags.find(t => t.id === mergeTargetId)?.usage_count} courses)
                      </p>
                      <p className="pt-2 border-t border-blue-300">
                        • Result: Target will have approximately {(tags.find(t => t.id === mergeSourceId)?.usage_count || 0) + (tags.find(t => t.id === mergeTargetId)?.usage_count || 0)} courses
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Warning: This action cannot be undone</p>
                      <p className="mt-1">The source tag will be permanently deleted after merging.</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMergeDialog(false);
                      setMergeSourceId(null);
                      setMergeTargetId(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleMergeTags}
                    disabled={!mergeSourceId || !mergeTargetId || mergeTagsMutation.isPending}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    {mergeTagsMutation.isPending ? 'Merging...' : 'Merge Tags'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManagement;

import { Plus, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemConfigApi } from '@/services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/system/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/system/ConfigTable';
import { BulkActionBar } from '@/components/admin/moderation/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/analytics/UsageAnalytics';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { ContentTag, TagFormData } from '@/types/systemConfig';
import { brandColors } from '@/theme/brand';

export const TagManagement: React.FC = () => {
  const { t } = useTranslation();
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
        title: t('common.success', 'Success'),
        message: t('admin.system.tags.messages.create_success', 'Tag created successfully'),
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.message || t('admin.system.tags.messages.create_error', 'Failed to create tag'),
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
        title: t('common.success', 'Success'),
        message: t('admin.system.tags.messages.update_success', 'Tag updated successfully'),
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.message || t('admin.system.tags.messages.update_error', 'Failed to update tag'),
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
        title: t('common.success', 'Success'),
        message: t('admin.system.tags.messages.delete_success', 'Tag deleted successfully'),
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.message || t('admin.system.tags.messages.delete_error', 'Failed to delete tag'),
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
          title: t('admin.system.tags.messages.partial_success', 'Partial Success'),
          message: t('admin.system.tags.messages.bulk_partial', '{{successful}} succeeded, {{failed}} failed', { successful: result.successful, failed: result.failed }),
        });
      } else {
        showNotification({
          type: 'success',
          title: t('common.success', 'Success'),
          message: t('admin.system.tags.messages.bulk_success', '{{count}} tags updated successfully', { count: result.successful }),
        });
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.message || t('admin.system.tags.messages.bulk_error', 'Bulk action failed'),
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
        title: t('common.success', 'Success'),
        message: t('admin.system.tags.messages.merge_success', 'Tags merged successfully'),
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.message || t('admin.system.tags.messages.merge_error', 'Failed to merge tags'),
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
      errors.name = t('admin.system.tags.errors.name_min', 'Tag name must be at least 2 characters');
    } else if (formData.name.length > 30) {
      errors.name = t('admin.system.tags.errors.name_max', 'Tag name must be less than 30 characters');
    } else if (!/^[\p{L}\p{N}\s-]+$/u.test(formData.name)) {
      errors.name = t('admin.system.tags.errors.name_invalid', 'Tag name must be letters, numbers, spaces or hyphens only');
    }

    if (formData.category && formData.category.length > 50) {
      errors.category = t('admin.system.tags.errors.category_max', 'Category must be less than 50 characters');
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
        title: t('admin.system.tags.errors.validation_title', 'Validation Error'),
        message: t('admin.system.tags.errors.validation_error', 'Please fix the errors before saving'),
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
        title: t('admin.system.tags.errors.cannot_delete_title', 'Cannot Delete'),
        message: t('admin.system.tags.errors.cannot_delete_usage', 'This tag is used by {{count}} course(s)', { count: tag.usage_count }),
      });
      return;
    }

    const confirmed = await confirm({
      title: t('admin.system.tags.delete_confirm_title', 'Delete Tag'),
      message: t('admin.system.tags.delete_confirm_message', 'Are you sure you want to delete "{{name}}"?', { name: tag.name }),
      confirmLabel: t('admin.system.tags.delete', 'Delete'),
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
          title: t('admin.system.tags.errors.cannot_delete_title', 'Cannot Delete'),
          message: t('admin.system.tags.errors.cannot_delete_bulk', '{{count}} selected tags are in use', { count: tagsWithUsage.length }),
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
        title: t('admin.system.tags.errors.validation_title', 'Validation Error'),
        message: t('admin.system.tags.errors.select_both', 'Please select both source and target tags'),
      });
      return;
    }

    if (mergeSourceId === mergeTargetId) {
      showNotification({
        type: 'error',
        title: t('admin.system.tags.errors.validation_title', 'Validation Error'),
        message: t('admin.system.tags.errors.different_tags', 'Source and target tags must be different'),
      });
      return;
    }

    const sourceTag = tags.find(t => t.id === mergeSourceId);
    const targetTag = tags.find(t => t.id === mergeTargetId);

    const confirmed = await confirm({
      title: t('admin.system.tags.merge_confirm_title', 'Merge Tags'),
      message: t('admin.system.tags.merge_confirm_message', 'Are you sure you want to merge "{{source}}" into "{{target}}"? This will reassign all courses from the source tag to the target tag and delete the source tag.', { source: sourceTag?.name, target: targetTag?.name }),
      confirmLabel: t('admin.system.tags.merge', 'Merge'),
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
      label: t('admin.system.tags.columns.name', 'Name'),
      sortable: true,
      width: '25%',
      render: (value, row: ContentTag) => renderColorBadge(row.color, value),
    },
    {
      key: 'category',
      label: t('admin.system.tags.columns.category', 'Category'),
      sortable: true,
      width: '20%',
      render: (value) => (
        <span className="text-gray-600">{value || '—'}</span>
      ),
    },
    {
      key: 'usage_count',
      label: t('admin.system.tags.columns.usage', 'Usage'),
      sortable: true,
      width: '15%',
      render: (value) => <UsageBadge count={value} />,
    },
    {
      key: 'is_active',
      label: t('admin.system.tags.columns.status', 'Status'),
      sortable: true,
      width: '15%',
      render: (value) => <StatusBadge active={value} />,
    },
  ];

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowMergeDialog(true)}
            className="inline-flex items-center px-6 py-2 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Shuffle className="h-5 w-5 mr-2" />
            {t('admin.system.tags.merge_tags', 'Merge Tags')}
          </button>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center px-6 py-2 text-white rounded-lg transition-colors shadow-sm active:scale-95"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('admin.system.tags.new_tag', 'New Tag')}
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
          searchPlaceholder={t('admin.system.tags.search_placeholder', 'Search tags...')}
          emptyMessage={t('admin.system.tags.empty_message', 'No tags found. Create your first tag to get started.')}
        />

        {/* Create/Edit Modal */}
        {(isCreating || editingTag) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div
                  className="px-6 py-4 text-white"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? t('admin.system.tags.create_tag', 'Create Tag') : t('admin.system.tags.edit_tag', 'Edit Tag')}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {isCreating ? t('admin.system.tags.create_desc', 'Add a new content tag') : t('admin.system.tags.edit_desc', 'Update tag details')}
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
                      {t('admin.system.tags.form.name', 'Tag Name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., sacraments"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {t('admin.system.tags.help_text', 'Letters, numbers, spaces or hyphens only (2-30 characters)')}
                    </p>
                  </div>

                  {/* Category Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.system.tags.form.category', 'Category')}
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Theology"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.category ? 'border-red-500' : 'border-gray-300'
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
                      {t('admin.system.tags.form.color', 'Color')}
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
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: brandColors.primaryHex }}
                    >
                      {createMutation.isPending || updateMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
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
              <div
                className="px-6 py-4 text-white"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Shuffle className="h-6 w-6" />
                      {t('admin.system.tags.merge_tags', 'Merge Tags')}
                    </h2>
                    <p className="text-blue-100 mt-1">
                      {t('admin.system.tags.merge_desc', 'Combine two tags by reassigning all courses from source to target')}
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
                    {t('admin.system.tags.form.source_tag', 'Source Tag (will be deleted)')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mergeSourceId || ''}
                    onChange={(e) => setMergeSourceId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('admin.system.tags.form.select_source', 'Select source tag...')}</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name} ({t('admin.system.tags.usage_count', '{{count}} courses', { count: tag.usage_count })})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('admin.system.tags.form.source_tag_help', 'All courses using this tag will be reassigned to the target tag')}
                  </p>
                </div>

                {/* Target Tag Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.system.tags.form.target_tag', 'Target Tag (will receive courses)')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mergeTargetId || ''}
                    onChange={(e) => setMergeTargetId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('admin.system.tags.form.select_target', 'Select target tag...')}</option>
                    {tags
                      .filter(tag => tag.id !== mergeSourceId)
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name} ({t('admin.system.tags.usage_count', '{{count}} courses', { count: tag.usage_count })})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('admin.system.tags.form.target_tag_help', 'This tag will keep all its courses plus those from the source tag')}
                  </p>
                </div>

                {/* Preview */}
                {mergeSourceId && mergeTargetId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">{t('admin.system.tags.preview_title', 'Merge Preview')}</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        • {t('admin.system.tags.preview_source', 'Source:')} <span className="font-medium">{tags.find(t => t.id === mergeSourceId)?.name}</span> ({t('admin.system.tags.usage_count', '{{count}} courses', { count: tags.find(t => t.id === mergeSourceId)?.usage_count || 0 })})
                      </p>
                      <p>
                        • {t('admin.system.tags.preview_target', 'Target:')} <span className="font-medium">{tags.find(t => t.id === mergeTargetId)?.name}</span> ({t('admin.system.tags.usage_count', '{{count}} courses', { count: tags.find(t => t.id === mergeTargetId)?.usage_count || 0 })})
                      </p>
                      <p className="pt-2 border-t border-blue-300">
                        • {t('admin.system.tags.preview_result', 'Result:')} {t('admin.system.tags.preview_result_desc', 'Target will have approximately {{count}} courses', { count: (tags.find(t => t.id === mergeSourceId)?.usage_count || 0) + (tags.find(t => t.id === mergeTargetId)?.usage_count || 0) })}
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
                      <p className="font-medium">{t('admin.system.tags.merge_warning_title', 'Warning: This action cannot be undone')}</p>
                      <p className="mt-1">{t('admin.system.tags.merge_warning_text', 'The source tag will be permanently deleted after merging.')}</p>
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
                    {mergeTagsMutation.isPending ? t('admin.system.tags.merging', 'Merging...') : t('admin.system.tags.merge', 'Merge Tags')}
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

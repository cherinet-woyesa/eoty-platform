import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { systemConfigApi } from '@/services/api/systemConfig';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/system/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/system/ConfigTable';
import { BulkActionBar } from '@/components/admin/moderation/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/analytics/UsageAnalytics';
import { IconPicker } from '@/components/admin/content/IconPicker';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { CourseCategory, CategoryFormData } from '@/types/systemConfig';
import { brandColors } from '@/theme/brand';

export const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<CourseCategory | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', icon: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => systemConfigApi.getCategories(false),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: systemConfigApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setIsCreating(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Category created successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create category',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryFormData> & { is_active?: boolean } }) =>
      systemConfigApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      setEditingCategory(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Category updated successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update category',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: systemConfigApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['system-config-metrics'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Category deleted successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete category',
      });
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: systemConfigApi.bulkActionCategories,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
          message: `${result.successful} categories updated successfully`,
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
    mutationFn: systemConfigApi.reorderCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Categories reordered successfully',
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to reorder categories',
      });
    },
  });

  // Form initialization
  const openCreateForm = () => {
    setFormData({ name: '', icon: '', description: '' });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (category: CourseCategory) => {
    setFormData({
      name: category.name,
      icon: category.icon || '',
      description: category.description || '',
    });
    setFormErrors({});
    setEditingCategory(category);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingCategory(null);
    setFormData({ name: '', icon: '', description: '' });
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      errors.name = 'Category name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      errors.name = 'Category name must be less than 50 characters';
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
      } else if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
      }
      closeForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (category: CourseCategory) => {
    if (category.usage_count > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Delete',
        message: `This category is used by ${category.usage_count} course(s)`,
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteMutation.mutateAsync(category.id);
    }
  };

  const handleToggleActive = async (category: CourseCategory) => {
    await updateMutation.mutateAsync({
      id: category.id,
      data: { is_active: !category.is_active },
    });
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      const categoriesWithUsage = categories.filter(
        c => ids.includes(c.id) && c.usage_count > 0
      );
      
      if (categoriesWithUsage.length > 0) {
        showNotification({
          type: 'error',
          title: 'Cannot Delete',
          message: `${categoriesWithUsage.length} selected categories are in use`,
        });
        throw new Error('Cannot delete categories in use');
      }
    }

    return await bulkActionMutation.mutateAsync({ action, ids });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      const items = reordered.map((cat, index) => ({
        id: cat.id,
        display_order: index,
      }));

      reorderMutation.mutate({ items });
    }
  };

  // Render icon helper
  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return <span className="text-xl">{iconName}</span>;
    return <IconComponent className="h-5 w-5" style={{ color: brandColors.primaryHex }} />;
  };

  // Table columns
  const columns: ConfigTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '25%',
      render: (value, row: CourseCategory) => (
        <div className="flex items-center gap-3">
          {renderIcon(row.icon)}
          <span className="font-medium">{value}</span>
        </div>
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
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={openCreateForm}
            className="text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Plus className="h-5 w-5" />
            New Category
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
            entityName="category"
          />
        )}

        {/* Table */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <ConfigTable
              columns={columns}
              data={categories}
              isLoading={isLoading}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewUsage={setViewingUsage}
              selectable
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              searchPlaceholder="Search categories..."
              emptyMessage="No categories found. Create your first category to get started."
            />
          </SortableContext>
        </DndContext>

        {/* Create/Edit Modal */}
        {(isCreating || editingCategory) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div
                  className="px-6 py-4 text-white"
                  style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {isCreating ? 'Create Category' : 'Edit Category'}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {isCreating ? 'Add a new course category' : 'Update category details'}
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
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Faith Formation"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      A descriptive name for the category (3-50 characters)
                    </p>
                  </div>

                  {/* Icon Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(true)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {formData.icon ? (
                          <>
                            {renderIcon(formData.icon)}
                            <span>{formData.icon}</span>
                          </>
                        ) : (
                          <span className="text-gray-500">Select an icon</span>
                        )}
                      </button>
                      {formData.icon && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: '' })}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      An icon to represent this category
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
                      placeholder="Describe this category..."
                      rows={4}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Optional description to help teachers understand this category (max 500 characters)
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
                      className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: brandColors.primaryHex }}
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
            entityType="category"
            entityId={viewingUsage.id}
            entityName={viewingUsage.name}
            onClose={() => setViewingUsage(null)}
          />
        )}

        {/* Icon Picker Modal */}
        {showIconPicker && (
          <IconPicker
            value={formData.icon}
            onChange={(icon) => {
              setFormData({ ...formData, icon });
              setShowIconPicker(false);
            }}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;

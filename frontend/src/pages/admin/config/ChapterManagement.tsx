import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, RefreshCw, Search } from 'lucide-react';
import { systemConfigApi } from '@/services/api/systemConfig';
import { chaptersApi } from '@/services/api/chapters';
import { ConfigTable, StatusBadge, UsageBadge } from '@/components/admin/system/ConfigTable';
import type { ConfigTableColumn } from '@/components/admin/system/ConfigTable';
import { BulkActionBar } from '@/components/admin/moderation/BulkActionBar';
import { UsageAnalytics } from '@/components/admin/analytics/UsageAnalytics';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import type { Chapter, ChapterFormData } from '@/types/systemConfig';
import { brandColors } from '@/theme/brand';

const COUNTRY_OPTIONS = [
  'Ethiopia',
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Kenya',
  'Nigeria',
  'South Africa',
  'India',
  'Philippines',
  'Australia',
  'Brazil',
  'Mexico',
  'Other'
];

const REGION_OPTIONS_DEFAULT = [
  'africa',
  'europe',
  'north america',
  'south america',
  'asia',
  'oceania',
  'antarctica',
  'other'
];

export const ChapterManagement = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState<ChapterFormData>({
    name: '',
    description: '',
    city: '',
    country: '',
    region: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [countryOptions, setCountryOptions] = useState<string[]>(COUNTRY_OPTIONS);
  const [regionOptions, setRegionOptions] = useState<string[]>(REGION_OPTIONS_DEFAULT);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [geoPreview, setGeoPreview] = useState<{ latitude?: number; longitude?: number; location?: string } | null>(null);
  const [geoPreviewError, setGeoPreviewError] = useState<string | null>(null);
  const { requestLocation, error: geoError, isLoading: geoLoading } = useGeolocation({ timeoutMs: 8000, maximumAgeMs: 60000, highAccuracy: true });

  // Fetch chapters
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => systemConfigApi.getChapters(false),
    onSuccess: () => setLastUpdated(new Date().toISOString())
  });

  // Fetch locations for filters
  const { data: locations } = useQuery({
    queryKey: ['chapter-locations'],
    queryFn: () => chaptersApi.getLocations(),
  });

  useEffect(() => {
    if (locations?.data) {
      setCountryOptions(locations.data.countries);
      setRegionOptions(locations.data.regions);
    }
  }, [locations]);

  // Dynamic country/region load with fallback (kept for form creation if needed, or removed if we strictly use backend)
  // User requested "real data from backend", so we prioritize that.
  // We can keep the restcountries fetch for the *form* options if we want to allow new countries, 
  // but for filters we use the backend data.
  
  /* 
  useEffect(() => {
    // ... existing restcountries fetch ...
  }, []); 
  */



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
    setFormData({ name: '', description: '', city: '', country: '', region: '', address: '' });
    setFormErrors({});
    setIsCreating(true);
  };

  const openEditForm = (chapter: Chapter) => {
    setFormData({
      name: chapter.name,
      description: chapter.description || '',
      city: (chapter as any).city || '',
      country: (chapter as any).country || '',
      region: (chapter as any).region || '',
      address: (chapter as any).location || '',
    });
    setFormErrors({});
    setEditingChapter(chapter);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingChapter(null);
    setFormData({ name: '', description: '', city: '', country: '', region: '', address: '' });
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

  const filteredChapters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return chapters.filter((ch) => {
      const matchesTerm =
        !term ||
        ch.name?.toLowerCase().includes(term) ||
        ch.description?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && ch.is_active) ||
        (statusFilter === 'inactive' && !ch.is_active);

      const matchesRegion = !regionFilter || (ch.region || '').toLowerCase() === regionFilter.toLowerCase();
      const matchesCountry = !countryFilter || (ch.country || '').toLowerCase() === countryFilter.toLowerCase();

      return matchesTerm && matchesStatus && matchesRegion && matchesCountry;
    });
  }, [chapters, searchTerm, statusFilter, regionFilter, countryFilter]);

  const runGeoPreview = async () => {
    setGeoPreviewError(null);
    setGeoPreview(null);
    if (!formData.address && !formData.city && !formData.country && !formData.region) {
      setGeoPreviewError('Add address/city/country/region first.');
      return;
    }
    try {
      const data = await systemConfigApi.geocodePreview({
        address: formData.address,
        city: formData.city,
        region: formData.region,
        country: formData.country
      });
      if (!data?.latitude && !data?.longitude && !data?.location) {
        setGeoPreviewError('No geocode result. Try a fuller address or add city/region.');
        return;
      }
      setGeoPreview({
        latitude: data?.latitude,
        longitude: data?.longitude,
        location: data?.location
      });
    } catch (err: any) {
      setGeoPreviewError(err.message || 'Geocode preview failed');
    }
  };

  const analyticsLikelyMissing = useMemo(() => {
    if (isLoading || chapters.length === 0) return false;
    return chapters.every((c) =>
      (c as any).average_completion_rate === 0 &&
      (c as any).monthly_active_users === 0 &&
      (c as any).storage_used_gb === 0
    );
  }, [chapters, isLoading]);

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
      key: 'location',
      label: 'Location',
      sortable: false,
      width: '25%',
      render: (_value, row) => (
        <div className="text-sm text-gray-700">
          {(row as any).city || '—'}, {(row as any).country || '—'}
          {(row as any).region && (
            <div className="text-xs text-gray-500">{(row as any).region}</div>
          )}
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

  if (isLoading && chapters.length === 0) {
    return (
      <div className="w-full h-full p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="flex justify-end">
          <div className="h-10 w-36 bg-gray-100 border border-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white border border-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        {/* Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            {lastUpdated && (
              <span className="px-2 py-1 rounded-full border border-stone-200 bg-white text-stone-600">
                Last updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['chapters'] })}
              className="inline-flex items-center px-3 py-2 bg-white border text-sm font-medium rounded-lg text-stone-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-opacity-40"
              style={{ 
                borderColor: `${brandColors.primaryHex}4D`, // 30% opacity
                '--tw-ring-color': brandColors.primaryHex 
              } as React.CSSProperties}
            >
              <RefreshCw className="h-4 w-4 mr-1" style={{ color: brandColors.primaryHex }} />
              Refresh
            </button>
          <button
            onClick={openCreateForm}
              className="text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-opacity-40"
              style={{ 
                backgroundColor: brandColors.primaryHex,
                '--tw-ring-color': brandColors.primaryHex 
              } as React.CSSProperties}
          >
            <Plus className="h-5 w-5" />
            New Chapter
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
            entityName="chapter"
          />
        )}

        {/* Search + Info */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search chapters by name or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ 
                  '--tw-ring-color': brandColors.primaryHex,
                  borderColor: searchTerm ? brandColors.primaryHex : undefined
                } as React.CSSProperties}
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
              >
                <option value="">All Regions</option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-40"
                style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
              >
                <option value="">All Countries</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <ConfigTable
          columns={columns}
          data={filteredChapters}
          isLoading={isLoading}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewUsage={setViewingUsage}
          selectable
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          searchable={false}
          emptyMessage="No chapters found. Create your first chapter to get started."
        />

        {/* Create/Edit Modal */}
        {(isCreating || editingChapter) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 text-white" style={{ backgroundColor: brandColors.primaryHex }}>
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
                      placeholder="e.g., Introduction to Orthodox Faith"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Optional description (max 500 characters)
                    </p>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder="e.g., Addis Ababa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder="e.g., Ethiopia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region/State</label>
                    <input
                      type="text"
                      value={formData.region || ''}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder="e.g., Oromia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address (for pin)</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder="Street, building, etc. (optional)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Used for geocoding the chapter location. Geocoding via Google Maps API.</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                        onClick={runGeoPreview}
                      >
                        Geocode Preview
                      </button>
                      {geoPreview && (
                        <span className="text-xs text-green-700">
                          {geoPreview.location || 'Location found'} ({geoPreview.latitude?.toFixed(4)}, {geoPreview.longitude?.toFixed(4)})
                        </span>
                      )}
                      {geoPreviewError && (
                        <span className="text-xs text-amber-700">
                          {geoPreviewError}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Map Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Map Preview</label>
                  {editingChapter && (editingChapter as any).latitude && (editingChapter as any).longitude ? (
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        title="Chapter location map"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(editingChapter as any).longitude - 0.01}%2C${(editingChapter as any).latitude - 0.01}%2C${(editingChapter as any).longitude + 0.01}%2C${(editingChapter as any).latitude + 0.01}&layer=mapnik&marker=${(editingChapter as any).latitude}%2C${(editingChapter as any).longitude}`}
                        style={{ border: 0 }}
                        className="w-full h-48"
                        loading="lazy"
                      ></iframe>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Map will appear after save once geocoding succeeds.</p>
                  )}
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
                      className="px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 hover:opacity-90"
                      style={{ backgroundColor: brandColors.primaryHex, '--tw-ring-color': brandColors.secondaryHex } as React.CSSProperties}
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

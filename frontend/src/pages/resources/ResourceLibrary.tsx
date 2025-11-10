import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resourcesApi } from '../../services/api/resources';
import type{ Resource, ResourceFilters, FilterOptions } from '../../types/resources';
import { Search, Filter, BookOpen, FileText, Image, Tag, Calendar, User } from 'lucide-react';

// Memoized loading spinner
const LoadingSpinner = React.memo(() => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
));

// Memoized empty state
const EmptyState = React.memo(() => (
  <div className="text-center py-12">
    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-lg font-medium text-gray-900">No resources found</h3>
    <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
  </div>
));

const ResourceLibrary: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    tags: [],
    languages: []
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Memoized load functions
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await resourcesApi.getResources(filters);
      if (response.success) {
        setResources(response.data.resources);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await resourcesApi.getFilters();
      if (response.success) {
        setFilterOptions(response.data);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  }, []);

  useEffect(() => {
    loadResources();
    loadFilterOptions();
  }, [loadResources, loadFilterOptions]);

  // Memoized event handlers
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, category: e.target.value || undefined }));
  }, []);

  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, language: e.target.value || undefined }));
  }, []);

  const handleTagChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTags = e.target.value ? [e.target.value] : [];
    setFilters(prev => ({ ...prev, tags: selectedTags.length > 0 ? selectedTags : undefined }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Memoized helper functions
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-green-500" />;
    return <BookOpen className="h-5 w-5 text-blue-500" />;
  }, []);

  // Memoized filtered resources count
  const resourcesCount = useMemo(() => resources.length, [resources]);

  // Memoized category options
  const categoryOptions = useMemo(() => filterOptions.categories.map(category => (
    <option key={category} value={category}>{category}</option>
  )), [filterOptions.categories]);

  // Memoized language options
  const languageOptions = useMemo(() => filterOptions.languages.map(lang => (
    <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
  )), [filterOptions.languages]);

  // Memoized tag options
  const tagOptions = useMemo(() => filterOptions.tags.map(tag => (
    <option key={tag} value={tag}>{tag}</option>
  )), [filterOptions.tags]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-33xl font-bold text-gray-900 mb-2">Resource Library</h1>
        <p className="text-gray-600">Search and explore faith-based resources</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search || ''}
              onChange={handleSearch}
            />
          </div>
          <button
            onClick={toggleFilters}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.category || ''}
                  onChange={handleCategoryChange}
                >
                  <option value="">All Categories</option>
                  {categoryOptions}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.language || ''}
                  onChange={handleLanguageChange}
                >
                  <option value="">All Languages</option>
                  {languageOptions}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.tags?.[0] || ''}
                  onChange={handleTagChange}
                >
                  <option value="">All Tags</option>
                  {tagOptions}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resources Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-gray-600">{resourcesCount} resources found</p>
          </div>
          
          {resourcesCount === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(resource => (
                <div key={resource.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(resource.file_type)}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                          {resource.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {resource.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ResourceLibrary);
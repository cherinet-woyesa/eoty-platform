import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { resourcesApi } from '@/services/api/resources';
import type{ Resource, ResourceFilters, FilterOptions } from '@/types/resources';
import { Search, Filter, BookOpen, FileText, Image, Tag, Calendar, User, Clock, X, Save, Star, TrendingUp, Upload, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

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
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    tags: [],
    languages: [],
    types: [],
    topics: [],
    authors: []
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; filters: ResourceFilters }>>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized load functions - Use enhanced search API (REQUIREMENT: Enhanced search)
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      // Use enhanced search if filters are applied, otherwise use regular getResources
      const hasFilters = filters.search || filters.type || filters.topic || filters.author || filters.dateFrom || filters.dateTo || filters.tags?.length || filters.category || filters.language;
      const response = hasFilters 
        ? await resourcesApi.searchResources(filters)
        : await resourcesApi.getResources(filters);
      if (response.success) {
        setResources(response.data.resources || []);
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
    // Load recent searches from localStorage
    const savedRecent = localStorage.getItem('resourceRecentSearches');
    if (savedRecent) {
      setRecentSearches(JSON.parse(savedRecent));
    }
    // Load saved searches from localStorage
    const savedSearchesData = localStorage.getItem('resourceSavedSearches');
    if (savedSearchesData) {
      setSavedSearches(JSON.parse(savedSearchesData));
    }
  }, [loadResources, loadFilterOptions]);

  // Generate search suggestions based on filter options
  const generateSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const suggestions: string[] = [];

    // Add matching categories
    filterOptions.categories.forEach(cat => {
      if (cat.toLowerCase().includes(queryLower) && !suggestions.includes(cat)) {
        suggestions.push(cat);
      }
    });

    // Add matching tags
    filterOptions.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower) && !suggestions.includes(tag)) {
        suggestions.push(tag);
      }
    });

    // Add matching topics
    filterOptions.topics.forEach(topic => {
      if (topic.toLowerCase().includes(queryLower) && !suggestions.includes(topic)) {
        suggestions.push(topic);
      }
    });

    // Add matching authors
    filterOptions.authors.forEach(author => {
      if (author.toLowerCase().includes(queryLower) && !suggestions.includes(author)) {
        suggestions.push(author);
      }
    });

    setSearchSuggestions(suggestions.slice(0, 5));
  }, [filterOptions]);

  // Enhanced search with autocomplete
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    setShowSuggestions(value.length > 0);

    // Debounce suggestion generation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      generateSuggestions(value);
    }, 300);
  }, [generateSuggestions]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setFilters(prev => ({ ...prev, search: suggestion }));
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    
    // Add to recent searches
    const updated = [suggestion, ...recentSearches.filter(s => s !== suggestion)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('resourceRecentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleSaveSearch = useCallback(() => {
    const name = prompt('Name this search:');
    if (name && Object.keys(filters).length > 0) {
      const newSaved = [...savedSearches, { name, filters }];
      setSavedSearches(newSaved);
      localStorage.setItem('resourceSavedSearches', JSON.stringify(newSaved));
    }
  }, [filters, savedSearches]);

  const handleLoadSavedSearch = useCallback((savedSearch: { name: string; filters: ResourceFilters }) => {
    setFilters(savedSearch.filters);
    setShowSavedSearches(false);
  }, []);

  const handleDeleteSavedSearch = useCallback((index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem('resourceSavedSearches', JSON.stringify(updated));
  }, [savedSearches]);

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

  // REQUIREMENT: Enhanced filters (type, topic, author, date)
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, type: e.target.value || undefined }));
  }, []);

  const handleTopicChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, topic: e.target.value || undefined }));
  }, []);

  const handleAuthorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, author: e.target.value || undefined }));
  }, []);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }));
  }, []);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }));
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

  // REQUIREMENT: Enhanced filters - Memoized options
  const typeOptions = useMemo(() => (filterOptions.types || []).map(type => (
    <option key={type} value={type}>{type}</option>
  )), [filterOptions.types]);

  const topicOptions = useMemo(() => (filterOptions.topics || []).map(topic => (
    <option key={topic} value={topic}>{topic}</option>
  )), [filterOptions.topics]);

  const authorOptions = useMemo(() => (filterOptions.authors || []).map(author => (
    <option key={author} value={author}>{author}</option>
  )), [filterOptions.authors]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-stone-800">Resource Library</h1>
            </div>
            <p className="text-stone-600 font-medium">
              {isTeacher ? 'Upload and manage faith-based resources for your students' : 'Search and explore faith-based resources'}
            </p>
          </div>
          {isTeacher && (
            <Link
              to="/teacher/resources/upload"
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resource
            </Link>
          )}
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search resources, tags, topics, authors..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search || ''}
              onChange={handleSearch}
              onFocus={() => {
                if (filters.search) setShowSuggestions(true);
                if (recentSearches.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow suggestion clicks
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            {filters.search && (
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, search: undefined }));
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Search Suggestions Dropdown */}
            {(showSuggestions && (searchSuggestions.length > 0 || recentSearches.length > 0)) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {/* Recent Searches */}
                {!filters.search && recentSearches.length > 0 && (
                  <div className="p-2 border-b border-gray-200">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </div>
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                      >
                        <Clock className="h-3 w-3 text-gray-400" />
                        {search}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Suggestions */}
                {searchSuggestions.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500">
                      <TrendingUp className="h-3 w-3" />
                      Suggestions
                    </div>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                      >
                        <Search className="h-3 w-3 text-gray-400" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {Object.keys(filters).length > 0 && (
              <button
                onClick={handleSaveSearch}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Save current search"
              >
                <Save className="h-4 w-4" />
                Save Search
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowSavedSearches(!showSavedSearches)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Saved searches"
              >
                <Star className="h-4 w-4" />
                Saved
              </button>
              
              {/* Saved Searches Dropdown */}
              {showSavedSearches && savedSearches.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Saved Searches</span>
                      <button
                        onClick={() => setShowSavedSearches(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {savedSearches.map((saved, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-2 py-2 hover:bg-gray-50 group"
                      >
                        <button
                          onClick={() => handleLoadSavedSearch(saved)}
                          className="flex-1 text-left text-sm text-gray-700"
                        >
                          {saved.name}
                        </button>
                        <button
                          onClick={() => handleDeleteSavedSearch(index)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={toggleFilters}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters - REQUIREMENT: Tag, type, topic, author, date */}
        {showFilters && (
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* REQUIREMENT: Type filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.type || ''}
                  onChange={handleTypeChange}
                >
                  <option value="">All Types</option>
                  {typeOptions}
                </select>
              </div>

              {/* REQUIREMENT: Topic filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.topic || ''}
                  onChange={handleTopicChange}
                >
                  <option value="">All Topics</option>
                  {topicOptions}
                </select>
              </div>

              {/* REQUIREMENT: Author filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by author..."
                  value={filters.author || ''}
                  onChange={handleAuthorChange}
                />
              </div>

              {/* REQUIREMENT: Date filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.dateFrom || ''}
                  onChange={handleDateFromChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.dateTo || ''}
                  onChange={handleDateToChange}
                />
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
            <p className="text-stone-600 font-medium">{resourcesCount} resources found</p>
          </div>
          
          {resourcesCount === 0 ? (
            <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-12 text-center shadow-md">
              <BookOpen className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-stone-800 mb-2">No resources found</h3>
              <p className="text-stone-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.map(resource => (
                <div 
                  key={resource.id} 
                  className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#27AE60]/50"
                  onClick={() => window.location.href = `/resources/${resource.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(resource.file_type)}
                        <div>
                          <h3 className="text-lg font-semibold text-stone-800">{resource.title}</h3>
                          {resource.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/30">
                              {resource.category}
                            </span>
                          )}
                          {resource.author && (
                            <p className="text-sm text-stone-600 mt-1">By {resource.author}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {resource.description && (
                      <p className="mt-3 text-sm text-stone-600 line-clamp-2">{resource.description}</p>
                    )}
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
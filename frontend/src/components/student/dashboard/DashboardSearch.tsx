import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Filter, Clock, TrendingUp, BookOpen, Users, Zap, MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { resourcesApi } from '@/services/api';
import { chaptersApi } from '@/services/api/chapters';
import communityPostsApi from '@/services/api/communityPosts';
import { apiClient } from '@/services/api/apiClient';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'activity' | 'resource' | 'chapter' | 'community';
  title: string;
  description: string;
  category?: string;
  progress?: number;
  relevance: number;
}

interface DashboardSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount: number;
  onQuickFilter?: (filter: string) => void;
}

const DashboardSearch: React.FC<DashboardSearchProps> = ({
  searchQuery,
  onSearchChange,
  resultsCount,
  onQuickFilter
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([
    'Old Testament',
    'New Testament',
    'Liturgy',
    'Fasting',
    'Saints',
    'Doctrine'
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('dashboard_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleSearch = useCallback((query: string) => {
    onSearchChange(query);
    if (query.trim()) {
      saveSearch(query);
    }
    setIsExpanded(false);
  }, [onSearchChange, saveSearch]);

  const clearSearch = useCallback(() => {
    onSearchChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearchChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    } else if (e.key === 'Enter' && searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  }, [searchQuery, handleSearch]);

  const handleQuickFilter = useCallback((filter: string) => {
    onQuickFilter?.(filter);
    handleSearch(filter);
  }, [onQuickFilter, handleSearch]);

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4 text-[#27AE60]" />;
      case 'lesson':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'activity':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'resource':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'chapter':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'community':
        return <Users className="h-4 w-4 text-indigo-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 90) return 'text-green-600';
    if (relevance >= 70) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const qLower = query.toLowerCase();
    try {
      const [coursesRes, enrolledRes, resourcesRes, chaptersRes, communityRes] = await Promise.allSettled([
        apiClient.get('/courses/catalog'),
        apiClient.get('/students/dashboard'),
        resourcesApi.searchResources({ search: query, limit: 5 } as any),
        chaptersApi.searchChapters(query),
        communityPostsApi.searchPosts({ q: query, sort: 'most_liked' })
      ]);

      const next: SearchResult[] = [];

      // Catalog courses
      if (coursesRes.status === 'fulfilled' && coursesRes.value?.data?.success) {
        const courses = coursesRes.value.data?.data?.courses || coursesRes.value.data?.courses || [];
        courses
          .filter((c: any) => (c.title || '').toLowerCase().includes(qLower) || (c.description || '').toLowerCase().includes(qLower))
          .slice(0, 6)
          .forEach((c: any) => {
            next.push({
              id: String(c.id),
              type: 'course',
              title: c.title,
              description: c.description || 'Course',
              category: c.category,
              progress: c.progress_percentage || c.progress,
              relevance: 90
            });
          });
      }

      // Enrolled courses from dashboard (to include drafts or non-catalog courses)
      if (enrolledRes.status === 'fulfilled' && enrolledRes.value?.data?.success) {
        const enrolled = enrolledRes.value.data?.data?.enrolledCourses || [];
        enrolled
          .filter((c: any) => (c.title || '').toLowerCase().includes(qLower) || (c.description || '').toLowerCase().includes(qLower))
          .slice(0, 4)
          .forEach((c: any) => {
            // Avoid duplicate IDs if already added
            if (!next.some((r) => r.type === 'course' && r.id === String(c.id))) {
              next.push({
                id: String(c.id),
                type: 'course',
                title: c.title,
                description: c.description || 'Course',
                category: c.category,
                progress: c.progress_percentage || c.progress,
                relevance: 88
              });
            }
          });
      }

      if (resourcesRes.status === 'fulfilled' && resourcesRes.value?.success) {
        const resources = resourcesRes.value.data?.resources || [];
        resources.slice(0, 4).forEach((r: any) => {
          next.push({
            id: String(r.id),
            type: 'resource',
            title: r.title,
            description: r.description || r.author || 'Resource',
            category: r.category,
            relevance: 82
          });
        });
      }

      if (chaptersRes.status === 'fulfilled' && chaptersRes.value?.success) {
        const chapters = chaptersRes.value.data?.chapters || [];
        chapters.slice(0, 3).forEach((ch: any) => {
          next.push({
            id: String(ch.id),
            type: 'chapter',
            title: ch.name,
            description: `${ch.city || ''} ${ch.country || ''}`.trim() || 'Chapter',
            category: ch.region,
            relevance: 78
          });
        });
      }

      if (communityRes.status === 'fulfilled' && communityRes.value?.success) {
        const posts = communityRes.value.data?.posts || [];
        posts.slice(0, 3).forEach((p: any) => {
          next.push({
            id: String(p.id),
            type: 'community',
            title: p.content?.slice(0, 80) || 'Community post',
            description: p.author_name || 'Community',
            relevance: 70
          });
        });
      }

      setResults(next);
      setError(null);
    } catch (err: any) {
      setResults([]);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  return (
    <div className="relative w-full lg:w-96">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search courses, journeys, chapters..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyPress}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] bg-white shadow-sm text-sm transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Search Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {recentSearches.length > 0 && !searchQuery && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Clock className="h-4 w-4 mr-2" />
                Recent Searches
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#27AE60]/10 rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <span>{search}</span>
                    <Search className="h-3 w-3 text-gray-400 group-hover:text-[#27AE60] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {!searchQuery && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <TrendingUp className="h-4 w-4 mr-2" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickFilter(search)}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-[#27AE60]/20 hover:text-[#16A085] transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Filters */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <Filter className="h-4 w-4 mr-2" />
              Quick Filters
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Bible Study', value: 'bible', color: 'green' },
                { label: 'Doctrine', value: 'doctrine', color: 'blue' },
                { label: 'Liturgical', value: 'liturgy', color: 'purple' },
                { label: 'Spiritual Growth', value: 'spiritual', color: 'orange' },
                { label: 'Amharic', value: 'amharic', color: 'red' },
                { label: 'Ge\'ez', value: 'geez', color: 'indigo' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => handleQuickFilter(filter.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center ${
                    filter.color === 'green' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                    filter.color === 'blue' ? 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20' :
                    filter.color === 'purple' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' :
                    filter.color === 'orange' ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' :
                    filter.color === 'red' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                    'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="p-4">
              <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-3">
                <span>Search Results</span>
                <span className="text-gray-500">{results.length} found {loading ? '(Searching...)' : ''}</span>
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-[#27AE60]/50 hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => {
                      handleSearch(result.title);
                      // Navigate to relevant page
                      switch (result.type) {
                        case 'course':
                          navigate(`/student/courses/${result.id}`);
                          break;
                        case 'chapter':
                          navigate(`/student/chapters?chapterId=${result.id}`);
                          break;
                        case 'resource':
                          navigate(`/student/all-resources?resourceId=${result.id}`);
                          break;
                        case 'community':
                          navigate('/student/community-hub');
                          break;
                        default:
                          break;
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-[#27AE60] transition-colors">
                            {result.title}
                          </h4>
                          <span className={`text-xs font-medium ${getRelevanceColor(result.relevance)}`}>
                            {result.relevance}% match
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {result.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {result.category && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              {result.category}
                            </span>
                          )}
                          {result.progress !== undefined && (
                            <div className="flex items-center space-x-1">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: `${result.progress}%` }}
                                />
                              </div>
                              <span>{result.progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* No Results State */}
              {results.length === 0 && !loading && (
                <div className="text-center py-6">
                  <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                  <p className="text-xs text-gray-400 mt-1">Try different keywords or check your spelling</p>
                </div>
              )}
              {loading && (
                <div className="text-center py-4 text-xs text-gray-500">Searching...</div>
              )}
            </div>
          )}

          {/* Search Tips */}
          {!searchQuery && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Tip:</span> Try keywords like "Old Testament", "Liturgy", "Saints", or filter by Bible/Doctrine/Spiritual Growth.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default React.memo(DashboardSearch);
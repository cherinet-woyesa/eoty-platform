import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, BookOpen, Users, TrendingUp, MapPin, MessageSquare } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { resourcesApi } from '@/services/api';
import { chaptersApi } from '@/services/api/chapters';
import communityPostsApi from '@/services/api/communityPosts';
import { apiClient } from '@/services/api/apiClient';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'user' | 'forum' | 'resource' | 'chapter' | 'community';
  title: string;
  description: string;
  url?: string;
  icon: React.ReactNode;
  relevance: number;
}

const SearchBar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save recent searches
  const saveToRecentSearches = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Real search (aggregates courses, enrolled, resources, chapters, forums/community)
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [catalogRes, enrolledRes, resourcesRes, chaptersRes, forumsRes, communityRes] = await Promise.allSettled([
        apiClient.get('/courses/catalog'),
        apiClient.get('/students/dashboard'),
        resourcesApi.searchResources({ search: query, limit: 5 } as any),
        chaptersApi.searchChapters(query),
        apiClient.get('/forums/search', { params: { q: query } }),
        communityPostsApi.searchPosts({ q: query, sort: 'most_liked' })
      ]);

      const results: SearchResult[] = [];
      const qLower = query.toLowerCase();

      // Catalog courses
      if (catalogRes.status === 'fulfilled' && catalogRes.value?.data?.success) {
        const courses = catalogRes.value.data?.data?.courses || catalogRes.value.data?.courses || [];
        courses
          .filter((c: any) => (c.title || '').toLowerCase().includes(qLower) || (c.description || '').toLowerCase().includes(qLower))
          .slice(0, 4)
          .forEach((c: any) => {
            results.push({
              id: String(c.id),
              type: 'course',
              title: c.title,
              description: c.description || 'Course',
              url: `/student/all-courses?courseId=${c.id}`,
              icon: <BookOpen className="h-4 w-4" />,
              relevance: 0.9
            });
          });
      }

      // Enrolled courses
      if (enrolledRes.status === 'fulfilled' && enrolledRes.value?.data?.success) {
        const enrolled = enrolledRes.value.data?.data?.enrolledCourses || [];
        enrolled
          .filter((c: any) => (c.title || '').toLowerCase().includes(qLower) || (c.description || '').toLowerCase().includes(qLower))
          .slice(0, 4)
          .forEach((c: any) => {
            if (!results.some((r) => r.type === 'course' && r.id === String(c.id))) {
              results.push({
                id: String(c.id),
                type: 'course',
                title: c.title,
                description: c.description || 'Course',
                url: `/student/all-courses?courseId=${c.id}`,
                icon: <BookOpen className="h-4 w-4" />,
                relevance: 0.86
              });
            }
          });
      }

      if (resourcesRes.status === 'fulfilled' && resourcesRes.value?.success) {
        const resources = resourcesRes.value.data?.resources || [];
        resources.slice(0, 4).forEach((r: any) => {
          results.push({
            id: String(r.id),
            type: 'resource',
            title: r.title,
            description: r.description || r.author || 'Resource',
            url: `/student/all-resources?resourceId=${r.id}`,
            icon: <BookOpen className="h-4 w-4" />,
            relevance: 0.82
          });
        });
      }

      if (chaptersRes.status === 'fulfilled' && chaptersRes.value?.success) {
        const chapters = chaptersRes.value.data?.chapters || [];
        chapters.slice(0, 3).forEach((ch: any) => {
          results.push({
            id: String(ch.id),
            type: 'chapter',
            title: ch.name,
            description: `${ch.city || ''} ${ch.country || ''}`.trim() || 'Chapter',
            url: `/student/chapters?chapterId=${ch.id}`,
            icon: <MapPin className="h-4 w-4" />,
            relevance: 0.78
          });
        });
      }

      if (forumsRes.status === 'fulfilled' && forumsRes.value?.data) {
        const posts = forumsRes.value.data?.posts || forumsRes.value.data?.results || [];
        posts.slice(0, 3).forEach((p: any) => {
          results.push({
            id: String(p.id),
            type: 'forum',
            title: p.title || p.content?.slice(0, 60) || 'Forum topic',
            description: p.content?.slice(0, 100) || 'Forum discussion',
            url: p.topic_id ? `/forums/topics/${p.topic_id}` : '/forums',
            icon: <MessageSquare className="h-4 w-4" />,
            relevance: 0.7
          });
        });
      }

      if (communityRes.status === 'fulfilled' && communityRes.value?.success) {
        const posts = communityRes.value.data?.posts || [];
        posts.slice(0, 3).forEach((p: any) => {
          results.push({
            id: String(p.id),
            type: 'community',
            title: p.content?.slice(0, 60) || 'Community post',
            description: p.author_name || 'Community',
            url: '/student/community-hub',
            icon: <Users className="h-4 w-4" />,
            relevance: 0.68
          });
        });
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, performSearch]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToRecentSearches(searchQuery);
      // Navigate to a global search route (fallback to dashboard with query param)
      navigate(`/student/dashboard?search=${encodeURIComponent(searchQuery)}`);
      setIsFocused(false);
    }
  }, [searchQuery, saveToRecentSearches, navigate]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  }, []);

  const handleRecentSearchClick = useCallback((query: string) => {
    setSearchQuery(query);
    saveToRecentSearches(query);
    inputRef.current?.focus();
  }, [saveToRecentSearches]);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.url) {
      navigate(result.url);
    }
    setIsFocused(false);
    setSearchQuery('');
  }, [navigate]);

  const showSuggestions = isFocused && (recentSearches.length > 0 || searchResults.length > 0);

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search courses, resources, chapters, forums..."
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white placeholder-gray-500"
          aria-label="Search"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200/60 py-2 z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex items-center text-xs font-medium text-gray-500 mb-2">
                <Clock className="h-3 w-3 mr-1" />
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center space-x-2"
                >
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div>
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs font-medium text-gray-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Search Results
                  </div>
                  {isLoading && (
                    <div className="text-xs text-gray-500">Searching...</div>
                  )}
                </div>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5 text-gray-500">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-gray-500 text-xs truncate">
                            {result.description}
                          </div>
                          <div className="text-xs text-gray-400 capitalize mt-1">
                            {result.type}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                !isLoading && (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    No results found for "{searchQuery}"
                  </div>
                )
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">
              Quick Filters
            </div>
            <div className="flex flex-wrap gap-1">
              {['Courses', 'Resources', 'Chapters', 'Forums', 'Community'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSearchQuery(filter.toLowerCase())}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(SearchBar);
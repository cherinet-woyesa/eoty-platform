import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { Search, X, Clock, BookOpen, Users, TrendingUp } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'user' | 'forum';
  title: string;
  description: string;
  url: string;
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

  // Mock search function - replace with actual API call
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock search results with explicit typing to fix TypeScript error
    const allResults: SearchResult[] = [
      {
        id: '1',
        type: 'course',
        title: 'Introduction to Theology',
        description: 'Basic theological concepts and principles',
        url: '/courses/1',
        icon: <BookOpen className="h-4 w-4" />,
        relevance: 0.95
      },
      {
        id: '2',
        type: 'lesson',
        title: 'Biblical Hermeneutics',
        description: 'Methods of biblical interpretation',
        url: '/lessons/2',
        icon: <BookOpen className="h-4 w-4" />,
        relevance: 0.87
      },
      {
        id: '3',
        type: 'forum',
        title: 'Theology Discussion Group',
        description: 'Active discussions about theological topics',
        url: '/forums/3',
        icon: <Users className="h-4 w-4" />,
        relevance: 0.76
      }
    ];

    const mockResults = allResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(mockResults);
    setIsLoading(false);
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
      // Navigate to search results page or trigger global search
      console.log('Searching for:', searchQuery);
      setIsFocused(false);
    }
  }, [searchQuery, saveToRecentSearches]);

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
    // Navigate to result URL
    console.log('Navigating to:', result.url);
    setIsFocused(false);
    setSearchQuery('');
  }, []);

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
          placeholder="Search courses, lessons, forums..."
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
              {['Courses', 'Lessons', 'Forums', 'Users'].map((filter) => (
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
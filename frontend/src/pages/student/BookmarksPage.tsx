import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bookmark, BookmarkCheck, Search, X, Clock, BookOpen, 
  PlayCircle, Trash2, Loader2, AlertCircle, Grid, List,
  Eye, CheckCircle, Calendar
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';

interface BookmarkedItem {
  id: number;
  user_id: number;
  entity_type: 'course' | 'lesson' | 'resource';
  entity_id: number;
  created_at: string;
  entity?: any; // The actual course/lesson object
}

const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lesson' | 'course'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Load bookmarks from API
  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/bookmarks');
      setBookmarks(response.data);
    } catch (err: any) {
      console.error('Failed to load bookmarks:', err);
      setError('Failed to load bookmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(item => {
      if (!item.entity) return false;

      const title = item.entity.title || item.entity.lesson_title || '';
      const description = item.entity.description || item.entity.lesson_description || '';
      
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || item.entity_type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [bookmarks, searchTerm, filterType]);

  // Remove bookmark
  const handleRemoveBookmark = useCallback(async (item: BookmarkedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const confirmed = await confirm({
        title: t('bookmarks_page.remove_title') || 'Remove bookmark',
        message: t('bookmarks_page.remove_message') || 'Remove this item from bookmarks?',
        confirmText: t('common.remove') || 'Remove',
        cancelText: t('common.cancel') || 'Cancel'
      });
      if (!confirmed) return;

      setRemovingId(item.id);

      await apiClient.post('/bookmarks/toggle', {
        entityType: item.entity_type,
        entityId: item.entity_id
      });

      // Remove from local state immediately
      setBookmarks(prev => prev.filter(b => b.id !== item.id));
      showNotification('success', t('common.success'), t('bookmarks_page.removed') || 'Removed from bookmarks.');
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      // Reload to ensure sync
      loadBookmarks();
    } finally {
      setRemovingId(null);
    }
  }, [loadBookmarks]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('common.today');
    if (days === 1) return t('common.yesterday');
    if (days < 7) return t('common.days_ago', { count: days });
    return date.toLocaleDateString();
  }, []);

  // Navigate to item
  const handleItemClick = useCallback((item: BookmarkedItem) => {
    if (item.entity_type === 'lesson') {
      // Assuming lesson entity has course_id
      navigate(`/student/courses/${item.entity.course_id}?lesson=${item.entity_id}`);
    } else if (item.entity_type === 'course') {
      navigate(`/student/courses/${item.entity_id}`);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="lg" text={t('bookmarks_page.loading_text')} variant="logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('bookmarks_page.title')}</h1>
          <p className="text-gray-500 mt-1">{t('bookmarks_page.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={t('bookmarks_page.grid_view_title')}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={t('bookmarks_page.list_view_title')}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('bookmarks_page.all_items')}
          </button>
          <button
            onClick={() => setFilterType('course')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === 'course'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('bookmarks_page.courses')}
          </button>
          <button
            onClick={() => setFilterType('lesson')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === 'lesson'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('bookmarks_page.lessons')}
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-900">{t('bookmarks_page.error_title')}</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={loadBookmarks}
            className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
          >
            {t('common.try_again')}
          </button>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{t('bookmarks_page.no_bookmarks_title')}</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            {searchTerm 
              ? t('bookmarks_page.no_bookmarks_desc_has_query', { query: searchTerm })
              : t('bookmarks_page.no_bookmarks_desc_empty')}
          </p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 text-primary-600 font-medium hover:text-primary-700"
            >
              {t('bookmarks_page.clear_search')}
            </button>
          )}
          {!searchTerm && (
            <Link 
              to="/student/browse-courses"
              className="mt-6 inline-flex items-center px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors"
            >
              {t('dashboard.student.browse_catalog')}
            </Link>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredBookmarks.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className={`relative ${viewMode === 'list' ? 'w-48 shrink-0' : 'aspect-video w-full'}`}>
                {item.entity?.cover_image || item.entity?.thumbnail ? (
                  <img 
                    src={item.entity.cover_image || item.entity.thumbnail} 
                    alt={item.entity.title || 'Content thumbnail'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    {item.entity_type === 'course' ? (
                      <BookOpen className="w-10 h-10 text-gray-300" />
                    ) : (
                      <PlayCircle className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-md ${
                    item.entity_type === 'course' 
                      ? 'bg-blue-900/80 text-white' 
                      : 'bg-gray-900/80 text-white'
                  }`}>
                    {item.entity_type === 'course' ? t('bookmarks_page.type_course') : t('bookmarks_page.type_lesson')}
                  </span>
                </div>

                {/* Remove Button (Hover) */}
                <button
                  onClick={(e) => handleRemoveBookmark(item, e)}
                  disabled={removingId === item.id}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-500 hover:text-red-600 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                  title={t('bookmarks_page.remove_bookmark_title')}
                >
                  {removingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Content Info */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                    {item.entity?.title || item.entity?.lesson_title || 'Untitled'}
                  </h3>
                  
                  {item.entity?.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.entity.description}
                    </p>
                  )}
                  
                  {item.entity_type === 'lesson' && item.entity?.course_title && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{item.entity.course_title}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('bookmarks_page.saved_prefix')} {formatDate(item.created_at)}</span>
                  </div>
                  
                  {item.entity?.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(item.entity.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;

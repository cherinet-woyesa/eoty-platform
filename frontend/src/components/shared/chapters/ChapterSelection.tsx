/**
 * FR7: Chapter Selection Component
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Check, X, Star } from 'lucide-react';
import { chaptersApi, type Chapter, type UserChapter } from '@/services/api/chapters';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface ChapterSelectionProps {
  onChapterSelected?: (chapter: Chapter) => void;
  showOnlyJoinable?: boolean;
  showOnlyMembership?: boolean;
}

const ChapterSelection: React.FC<ChapterSelectionProps> = ({
  onChapterSelected,
  showOnlyJoinable = false,
  showOnlyMembership = false
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    country?: string;
    city?: string;
    region?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
    fetchUserChapters();
  }, [filters]);

  const fetchChapters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let response;
      if (searchTerm) {
        response = await chaptersApi.searchChapters(searchTerm);
      } else {
        response = await chaptersApi.getChapters(filters);
      }

      if (response.success) {
        setChapters(response.data.chapters || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch chapters:', err);
      setError(err.message || 'Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserChapters = async () => {
    try {
      const response = await chaptersApi.getUserChapters();
      if (response.success) {
        setUserChapters(response.data.chapters || []);
      }
    } catch (err) {
      console.error('Failed to fetch user chapters:', err);
    }
  };

  const handleJoinChapter = async (chapter: Chapter) => {
    try {
      const isFirstChapter = userChapters.length === 0;
      const response = await chaptersApi.joinChapter(
        chapter.id,
        'member',
        isFirstChapter // Set as primary if it's the first chapter
      );

      if (response.success) {
        await fetchUserChapters();
        onChapterSelected?.(chapter);
        // Force refresh of chapters list to update UI state
        await fetchChapters();
        showNotification({
          type: 'success',
          title: 'Request Sent',
          message: `Join request for ${chapter.name} submitted for approval.`
        });
      }
    } catch (err: any) {
      console.error('Failed to join chapter:', err);
      const errorMessage = err.message || 'Failed to join chapter';
      setError(errorMessage);
      showNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  };

  const handleLeaveChapter = async (chapterId: number) => {
    try {
      const response = await chaptersApi.leaveChapter(chapterId);
      if (response.success) {
        await fetchUserChapters();
        // Force refresh of chapters list to update UI state
        await fetchChapters();
        alert('Successfully left chapter.');
      }
    } catch (err: any) {
      console.error('Failed to leave chapter:', err);
      setError(err.message || 'Failed to leave chapter');
    }
  };

  const handleSetPrimary = async (chapterId: number) => {
    try {
      const response = await chaptersApi.setPrimaryChapter(chapterId);
      if (response.success) {
        await fetchUserChapters();
      }
    } catch (err: any) {
      console.error('Failed to set primary chapter:', err);
      setError(err.message || 'Failed to set primary chapter');
    }
  };

  const isUserMember = (chapterId: number) => {
    return userChapters.some(uc => uc.chapter_id === chapterId);
  };

  const getUserChapterRole = (chapterId: number) => {
    const userChapter = userChapters.find(uc => uc.chapter_id === chapterId);
    return userChapter?.role;
  };

  const getUserChapterStatus = (chapterId: number) => {
    const userChapter = userChapters.find(uc => uc.chapter_id === chapterId);
    return userChapter?.status;
  };

  const isPrimaryChapter = (chapterId: number) => {
    return userChapters.some(uc => uc.chapter_id === chapterId && uc.is_primary);
  };

  const filteredChapters = chapters.filter(ch => {
    const isMember = isUserMember(ch.id);
    if (showOnlyJoinable) return !isMember;
    if (showOnlyMembership) return isMember;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search chapters by name, location, or topic..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) {
                fetchChapters();
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.country || ''}
            onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Countries</option>
            {/* In production, populate from API */}
          </select>

          <select
            value={filters.region || ''}
            onChange={(e) => setFilters({ ...filters, region: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Regions</option>
            <option value="North America">North America</option>
            <option value="Europe">Europe</option>
            <option value="Asia">Asia</option>
            <option value="Africa">Africa</option>
            <option value="South America">South America</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Chapters List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading chapters...</div>
      ) : filteredChapters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No chapters found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChapters.map((chapter) => {
            const isMember = isUserMember(chapter.id);
            const isPrimary = isPrimaryChapter(chapter.id);
            const role = getUserChapterRole(chapter.id);
            const status = getUserChapterStatus(chapter.id);

            return (
              <div
                key={chapter.id}
                className={`border rounded-lg p-4 transition-all flex flex-col h-full ${
                  isPrimary
                    ? 'border-blue-500 bg-blue-50'
                    : status === 'pending'
                    ? 'border-yellow-500 bg-yellow-50'
                    : isMember
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-semibold text-lg text-gray-900 truncate" title={chapter.name}>{chapter.name}</h3>
                    {role && status !== 'pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/50 text-gray-700 border border-gray-200 mt-1">
                        {role}
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 mt-1">
                        Pending Approval
                      </span>
                    )}
                  </div>
                  {isPrimary && (
                    <Star className="h-5 w-5 text-blue-500 fill-current flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-3 flex-1">
                  {chapter.city && chapter.country && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{chapter.city}, {chapter.country}</span>
                    </div>
                  )}
                  {chapter.region && (
                    <div className="text-xs text-gray-500 truncate">{chapter.region}</div>
                  )}
                  {chapter.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{chapter.description}</p>
                  )}
                </div>

                {chapter.topics && chapter.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {chapter.topics.slice(0, 3).map((topic, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  {isMember ? (
                    <>
                      {status !== 'pending' ? (
                        <>
                          {!isPrimary && (
                            <button
                              onClick={() => handleSetPrimary(chapter.id)}
                              className="flex-1 px-2 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap font-medium"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            onClick={() => onChapterSelected?.(chapter)}
                            className="flex-1 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                          >
                            View
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="flex-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg opacity-75 cursor-not-allowed font-medium"
                        >
                          Pending
                        </button>
                      )}
                      <button
                        onClick={() => handleLeaveChapter(chapter.id)}
                        className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title={status === 'pending' ? "Cancel Request" : "Leave Chapter"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleJoinChapter(chapter)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <Users className="h-4 w-4" />
                      Join Chapter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChapterSelection;


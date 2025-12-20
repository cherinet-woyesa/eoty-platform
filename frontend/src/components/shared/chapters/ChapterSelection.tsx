/**
 * FR7: Chapter Selection Component
 * REQUIREMENT: Multi-city/chapter membership, location/topic based
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Users, X, Star, Compass, AlertCircle } from 'lucide-react';
import { chaptersApi, type Chapter, type UserChapter } from '@/services/api/chapters';
import { useGeolocation } from '@/hooks/useGeolocation';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { brandColors } from '@/theme/brand';

interface ChapterSelectionProps {
  onChapterSelected?: (chapter: Chapter) => void;
  showOnlyJoinable?: boolean;
  showOnlyMembership?: boolean;
}

const ChapterSelection: React.FC<ChapterSelectionProps> = React.memo(
  ({ onChapterSelected, showOnlyJoinable = false, showOnlyMembership = false }) => {
    const { t } = useTranslation();
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<{
      country?: string;
      city?: string;
      region?: string;
    }>({});
    const [facetCountries, setFacetCountries] = useState<string[]>([]);
    const [facetRegions, setFacetRegions] = useState<string[]>([]);
    const [facetCities, setFacetCities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [useNearby, setUseNearby] = useState(false);
    const [distanceKm, setDistanceKm] = useState(50);
    const { coords, isLoading: isLocating, error: geoError, requestLocation, clearError } = useGeolocation({
      timeoutMs: 8000,
      maximumAgeMs: 60000,
      highAccuracy: true
    });
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [leavingId, setLeavingId] = useState<number | null>(null);
    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [hasTriedNearby, setHasTriedNearby] = useState(false);

    const hydrateFacets = (list: Chapter[]) => {
      const countries = new Set<string>();
      const regions = new Set<string>();
      const cities = new Set<string>();
      list.forEach((ch) => {
        if (ch.country) countries.add(ch.country);
        if ((ch as any).region) regions.add((ch as any).region);
        if (ch.city) cities.add(ch.city);
      });
      setFacetCountries(Array.from(countries).sort());
      setFacetRegions(Array.from(regions).sort());
      setFacetCities(Array.from(cities).sort());
    };

    const fetchChapters = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        if (useNearby && coords) {
          response = await chaptersApi.getNearby({ lat: coords.lat, lng: coords.lng, radiusKm: distanceKm, limit: 100 });
        } else if (searchTerm) {
          response = await chaptersApi.searchChapters(searchTerm);
        } else {
          response = await chaptersApi.getChapters(filters);
        }

        if (response.success) {
          const incoming = response.data.chapters || [];
          const mapped = incoming.map((ch: any) => ({
            ...ch,
            distance: ch.distance_km ?? ch.distance ?? ch.distanceKm ?? null
          }));
          setChapters(mapped);
          hydrateFacets(mapped);
        } else {
          throw new Error(response.message || 'Failed to load chapters');
        }
      } catch (err: any) {
        console.error('Failed to fetch chapters:', err);
        setError(err.message || 'Failed to load chapters');
        // Fallback: if nearby fails, try default list once
        if (useNearby && !coords) return;
        if (useNearby) {
          try {
            const fallback = await chaptersApi.getChapters(filters);
            if (fallback.success) {
              setChapters(fallback.data.chapters || []);
              setUseNearby(false);
              clearError();
            }
          } catch {
            /* ignore */
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, [useNearby, coords, distanceKm, searchTerm, filters, clearError]);

    const fetchUserChapters = useCallback(async () => {
      try {
        const response = await chaptersApi.getUserChapters();
        if (response.success) {
          setUserChapters(response.data.chapters || []);
        }
      } catch (err) {
        console.error('Failed to fetch user chapters:', err);
      }
    }, []);

    useEffect(() => {
      fetchUserChapters();
    }, [fetchUserChapters]);

    // Debounce search and handle other updates
    useEffect(() => {
      const t = setTimeout(() => {
        fetchChapters();
      }, 350);
      return () => clearTimeout(t);
    }, [fetchChapters]);

    const handleJoinChapter = async (chapter: Chapter) => {
      try {
        setJoiningId(chapter.id);
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
          setToast({ type: 'success', message: t('chapters.join_success', { name: chapter.name }) });
        }
      } catch (err: any) {
        console.error('Failed to join chapter:', err);
        const errorMessage = err.message || 'Failed to join chapter';
        setError(errorMessage);
        setToast({ type: 'error', message: errorMessage });
      } finally {
        setJoiningId(null);
      }
    };

    const handleLeaveChapter = async (chapterId: number) => {
      try {
        setLeavingId(chapterId);
        const response = await chaptersApi.leaveChapter(chapterId);
        if (response.success) {
          await fetchUserChapters();
          // Force refresh of chapters list to update UI state
          await fetchChapters();
          setToast({ type: 'success', message: t('chapters.leave_success') });
        }
      } catch (err: any) {
        console.error('Failed to leave chapter:', err);
        setError(err.message || 'Failed to leave chapter');
        setToast({ type: 'error', message: err.message || t('chapters.error_generic') });
      } finally {
        setLeavingId(null);
      }
    };

    const handleSetPrimary = async (chapterId: number) => {
      try {
        setPrimaryId(chapterId);
        const response = await chaptersApi.setPrimaryChapter(chapterId);
        if (response.success) {
          await fetchUserChapters();
          setToast({ type: 'success', message: t('chapters.set_primary_success') });
        }
      } catch (err: any) {
        console.error('Failed to set primary chapter:', err);
        setError(err.message || 'Failed to set primary chapter');
        setToast({ type: 'error', message: err.message || t('chapters.error_generic') });
      } finally {
        setPrimaryId(null);
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

    const renderMembershipBadge = (chapterId: number) => {
      const role = getUserChapterRole(chapterId);
      const status = getUserChapterStatus(chapterId);
      const primary = isPrimaryChapter(chapterId);

      if (!role && !status) return null;

      return (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {role && (
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium capitalize">
              {t(`chapters.role.${role}`, role.replace('_', ' '))}
            </span>
          )}
          {status && (
            <span className={`px-2 py-1 rounded-full border font-medium ${status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
              }`}>
              {t(`chapters.status.${status}`, status)}
            </span>
          )}
          {primary && (
            <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
              {t('chapters.primary')}
            </span>
          )}
        </div>
      );
    };

    const membershipChapters = useMemo(() => {
      if (!showOnlyMembership) return null;
      // Prefer userChapters data directly so membership view works even if chapter list is filtered/empty
      return (userChapters || []).map((uc: any) => ({
        id: uc.chapter_id,
        name: uc.chapter_name || uc.name || 'Chapter',
        country: uc.country,
        city: uc.city,
        region: uc.region,
        description: uc.description,
        topics: uc.topics,
        status: uc.status,
        role: uc.role,
        is_primary: uc.is_primary,
        distance: uc.distance_km ?? uc.distance ?? null
      })) as any[];
    }, [showOnlyMembership, userChapters]);

    const matchesFilters = useCallback((ch: any) => {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const haystack = [
          ch.name,
          ch.city,
          ch.country,
          ch.region,
          ch.description
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (filters.country && ch.country !== filters.country) return false;
      if (filters.region && ch.region !== filters.region) return false;
      if (filters.city && ch.city !== filters.city) return false;
      return true;
    }, [searchTerm, filters.country, filters.region, filters.city]);

    const filteredChapters = useMemo(() => {
      if (showOnlyMembership && membershipChapters) {
        const filtered = membershipChapters.filter(matchesFilters);
        // If filters hide all but membership exists, fallback to showing all memberships
        if (filtered.length === 0 && membershipChapters.length > 0) {
          return membershipChapters;
        }
        return filtered;
      }
      return chapters
        .filter(ch => {
          const isMember = isUserMember(ch.id);
          if (showOnlyJoinable) return !isMember;
          if (showOnlyMembership) return isMember;
          return true;
        })
        .filter(matchesFilters);
    }, [chapters, showOnlyJoinable, showOnlyMembership, userChapters, membershipChapters, matchesFilters]);

    const handleEnableNearby = () => {
      setUseNearby(true);
      setHasTriedNearby(true);
      requestLocation();
    };

    useEffect(() => {
      if (!toast) return;
      const id = setTimeout(() => setToast(null), 2400);
      return () => clearTimeout(id);
    }, [toast]);

    return (
      <div className="space-y-4">
        {toast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border text-white text-sm font-semibold"
              style={{
                background: toast.type === 'success'
                  ? 'linear-gradient(120deg, var(--brand-primary), var(--brand-primary-hover))'
                  : 'linear-gradient(120deg, #ef4444, #b91c1c)',
                borderColor: toast.type === 'success' ? 'rgba(49,46,129,0.25)' : 'rgba(239,68,68,0.35)'
              }}
            >
              {toast.message}
            </div>
          </div>
        )}
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('chapters.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filters.country || ''}
              onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('chapters.all_countries')}</option>
              {facetCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filters.region || ''}
              onChange={(e) => setFilters({ ...filters, region: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('chapters.all_regions')}</option>
              {facetRegions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={filters.city || ''}
              onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('chapters.all_cities')}</option>
              {facetCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg">
              <input
                id="nearby"
                type="checkbox"
                checked={useNearby}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleEnableNearby();
                  } else {
                    setUseNearby(false);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="nearby" className="text-sm text-gray-700 flex items-center gap-1">
                <Compass className="h-4 w-4 text-blue-600" />
                {t('chapters.near_me')}
              </label>
            </div>
            {useNearby && (
              <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg bg-blue-50">
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                />
                <span className="text-sm text-blue-800 font-medium">{distanceKm} {t('chapters.km')}</span>
                <button
                  onClick={() => handleEnableNearby()}
                  disabled={isLocating}
                  className="text-xs px-2 py-1 border border-blue-300 rounded bg-white hover:bg-blue-100 disabled:opacity-50"
                >
                  {isLocating ? t('chapters.locating') : t('common.refresh')}
                </button>
              </div>
            )}
          </div>

          {geoError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm">
              {geoError || t('chapters.nearby_error')}
            </div>
          )}

          {searchTerm && filteredChapters.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              {t('chapters.no_results_query', { query: searchTerm })}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Chapters List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LoadingSpinner message={t('common.loading')} />
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-8 text-gray-600 space-y-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Compass className="h-5 w-5" />
              <span>{t('chapters.no_results')}</span>
            </div>
            {useNearby ? (
              <p className="text-sm">{t('chapters.no_results_nearby')}</p>
            ) : (
              <p className="text-sm">{t('chapters.adjust_filters')}</p>
            )}
            <div className="flex items-center justify-center gap-2">
              {useNearby && (
                <button
                  onClick={() => setDistanceKm((d) => Math.min(d + 25, 200))}
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t('chapters.expand_radius')}
                </button>
              )}
              {(useNearby || searchTerm || filters.country || filters.region) && (
                <button
                  onClick={() => {
                    setUseNearby(false);
                    setDistanceKm(50);
                    setSearchTerm('');
                    setFilters({});
                  }}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-100"
                >
                  {t('chapters.clear_filters')}
                </button>
              )}
            </div>
            {!coords && hasTriedNearby && !useNearby && (
              <button
                onClick={handleEnableNearby}
                className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
              >
                {t('chapters.try_near_me')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredChapters.map((chapter) => {
              const isMember = isUserMember(chapter.id);
              const isPrimary = isPrimaryChapter(chapter.id);
              const status = getUserChapterStatus(chapter.id);

              return (
                <div
                  key={chapter.id}
                  className={`border rounded-lg p-4 transition-all flex flex-col h-full ${isPrimary
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
                      {renderMembershipBadge(chapter.id)}
                    </div>
                    {isPrimary && (
                      <Star className="h-5 w-5 text-blue-500 fill-current flex-shrink-0" />
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-3 flex-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {chapter.city || '—'}, {chapter.country || '—'}
                      </span>
                      {typeof chapter.distance === 'number' && isFinite(chapter.distance) && (
                        <span className="text-xs text-blue-700 font-medium ml-2">
                          {chapter.distance.toFixed(1)} {t('chapters.km')}
                        </span>
                      )}
                    </div>
                    {chapter.region && (
                      <div className="text-xs text-gray-500 truncate">{chapter.region}</div>
                    )}
                    {chapter.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{chapter.description}</p>
                    )}
                  </div>

                  {chapter.topics && chapter.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {chapter.topics.slice(0, 3).map((topic: any, idx: number) => (
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
                                disabled={primaryId === chapter.id}
                                className="flex-1 px-2 py-2 text-xs sm:text-sm text-white rounded-lg transition-colors whitespace-nowrap font-medium disabled:opacity-60"
                                style={{ backgroundColor: brandColors.primaryHex }}
                              >
                                {primaryId === chapter.id ? t('common.updating') || 'Updating...' : t('chapters.set_primary')}
                              </button>
                            )}
                            <button
                              onClick={() => onChapterSelected?.(chapter)}
                              className="flex-1 px-3 py-2 text-sm text-white rounded-lg transition-colors font-medium"
                              style={{ backgroundColor: brandColors.primaryHex }}
                            >
                              {t('chapters.view')}
                            </button>
                          </>
                        ) : (
                          <button
                            disabled
                            className="flex-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg opacity-75 cursor-not-allowed font-medium"
                          >
                            {t('chapters.status.pending')}
                          </button>
                        )}
                        <button
                          onClick={() => handleLeaveChapter(chapter.id)}
                          disabled={leavingId === chapter.id}
                          className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
                          title={status === 'pending' ? t('chapters.cancel_request') : t('chapters.leave')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleJoinChapter(chapter)}
                        disabled={joiningId === chapter.id}
                        className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-60"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        <Users className="h-4 w-4" />
                        {joiningId === chapter.id ? t('common.loading') || 'Loading...' : t('chapters.join')}
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
  });

export default ChapterSelection;


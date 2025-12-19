import React, { useMemo } from 'react';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';

interface EngagementHeatmapProps {
  videoDuration?: number;
  watchData?: Array<{ timestamp: number; watchCount: number }>;
  lessonId?: string | number;
  enableFetch?: boolean;
  segments?: number;
  className?: string;
}

const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  videoDuration,
  watchData,
  lessonId,
  enableFetch = !!lessonId,
  segments = 80,
  className = ''
}) => {
  const { t } = useTranslation();

  const { data: fetchedHeatmap, isLoading } = useQuery({
    queryKey: ['lesson-heatmap', lessonId, segments],
    enabled: enableFetch && !!lessonId,
    queryFn: async () => {
      const res = await apiClient.get(`/video-analytics/lessons/${lessonId}/heatmap`, {
        params: { segments }
      });
      return res?.data?.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  const duration = fetchedHeatmap?.duration || videoDuration || 0;
  const rawData = enableFetch ? fetchedHeatmap?.segments || [] : watchData || [];

  const segmentsCount = segments;
  const segmentDuration = duration > 0 ? duration / segmentsCount : 0;

  const segmentData = useMemo(() => {
    if (!duration || segmentDuration === 0) return [];
    const segmentsArray = Array(segmentsCount)
      .fill(0)
      .map((_, i) => ({
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
        watchCount: 0
      }));

    rawData.forEach(({ timestamp, watchCount }) => {
      const segmentIndex = Math.floor(timestamp / segmentDuration);
      if (segmentIndex >= 0 && segmentIndex < segmentsArray.length) {
        segmentsArray[segmentIndex].watchCount += watchCount;
      }
    });

    return segmentsArray;
  }, [rawData, segmentDuration, segmentsCount, duration]);

  const maxWatchCount = Math.max(...segmentData.map(s => s.watchCount), 1);

  const metrics = useMemo(() => {
    if (segmentData.length === 0) {
      return {
        totalWatches: 0,
        avgWatchCount: 0,
        peakSegment: { startTime: 0, watchCount: 0 },
        lowSegment: { startTime: 0, watchCount: 0 },
        dropOffPoints: []
      };
    }

    const totalWatches = segmentData.reduce((sum, s) => sum + s.watchCount, 0);
    const avgWatchCount = totalWatches / segmentData.length;
    const peakSegment = segmentData.reduce(
      (max, s) => (s.watchCount > max.watchCount ? s : max),
      segmentData[0]
    );
    const lowSegment = segmentData.reduce(
      (min, s) => (s.watchCount < min.watchCount ? s : min),
      segmentData[0]
    );

    const dropOffPoints: number[] = [];
    for (let i = 1; i < segmentData.length; i++) {
      const prevCount = segmentData[i - 1].watchCount;
      const currCount = segmentData[i].watchCount;
      const dropPercent = prevCount > 0 ? ((prevCount - currCount) / prevCount) * 100 : 0;
      if (dropPercent > 30 && currCount < avgWatchCount * 0.5) {
        dropOffPoints.push(segmentData[i].startTime);
      }
    }

    return {
      totalWatches,
      avgWatchCount,
      peakSegment,
      lowSegment,
      dropOffPoints
    };
  }, [segmentData]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHeatColor = (watchCount: number, maxCount: number): string => {
    if (maxCount === 0) return 'bg-gray-200';
    const intensity = watchCount / maxCount;
    if (intensity >= 0.8) return 'bg-blue-700';
    if (intensity >= 0.6) return 'bg-blue-500';
    if (intensity >= 0.4) return 'bg-cyan-400';
    if (intensity >= 0.2) return 'bg-sky-200';
    return 'bg-gray-200';
  };

  const timeMarkers = duration
    ? [0, duration / 4, duration / 2, (3 * duration) / 4, duration]
    : [];

  const emptyState = segmentData.length === 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-2">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
          {t('analytics.engagement_heatmap', 'Engagement Heatmap')}
        </h3>
        <p className="text-sm text-gray-600">
          {t(
            'analytics.engagement_heatmap_desc',
            'Visual representation of where viewers watch most in your video'
          )}
        </p>
      </div>

      {isLoading && <div className="h-8 bg-gray-100 rounded-lg animate-pulse mb-4" />}

      {!isLoading && emptyState && (
        <div className="text-center py-6 text-sm text-gray-600">
          {t('analytics.no_heatmap_data', 'No heatmap data available yet.')}
        </div>
      )}

      {!emptyState && (
        <>
          <div className="mb-6">
            <div className="flex items-center space-x-1 mb-2">
              {segmentData.map((segment, index) => {
                const color = getHeatColor(segment.watchCount, maxWatchCount);
                const pct = maxWatchCount
                  ? Math.round((segment.watchCount / maxWatchCount) * 100)
                  : 0;
                return (
                  <div
                    key={index}
                    className={`flex-1 h-6 sm:h-8 ${color} rounded-sm transition-all duration-200 hover:opacity-80 cursor-pointer border border-gray-300/30`}
                    title={`${formatTime(segment.startTime)} - ${formatTime(
                      segment.endTime
                    )}: ${segment.watchCount} ${t('analytics.viewers', 'views')} (${pct}% ${t(
                      'analytics.of_peak',
                      'of peak'
                    )})`}
                  />
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-2">
              {timeMarkers.map((tm, idx) => (
                <span key={idx}>{formatTime(tm)}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-700/10 to-blue-500/10 rounded-lg p-4 border border-blue-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('analytics.peak_engagement', 'Peak Engagement')}
                </span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatTime(metrics.peakSegment.startTime)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {metrics.peakSegment.watchCount} {t('analytics.viewers', 'viewers')}
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-200/40 to-cyan-200/30 rounded-lg p-4 border border-sky-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('analytics.average_engagement', 'Average Engagement')}
                </span>
                <Clock className="h-4 w-4 text-sky-700" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {metrics.avgWatchCount.toFixed(1)} {t('analytics.viewers', 'viewers')}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {t('analytics.per_segment', 'Per segment')}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border border-gray-300/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('analytics.low_engagement', 'Low Engagement')}
                </span>
                <TrendingDown className="h-4 w-4 text-gray-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatTime(metrics.lowSegment.startTime)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {metrics.lowSegment.watchCount} {t('analytics.viewers', 'viewers')}
              </div>
            </div>
          </div>

          {metrics.dropOffPoints.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">
                {t('analytics.drop_off_points', 'Potential Drop-off Points')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {metrics.dropOffPoints.slice(0, 5).map((time, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium"
                  >
                    {formatTime(time)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-700 mt-2">
                {t(
                  'analytics.review_sections',
                  'Consider reviewing these sections to improve engagement'
                )}
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{t('common.legend', 'Legend')}:</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span>{t('common.low', 'Low')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-sky-200 rounded"></div>
                  <span>{t('common.moderate', 'Moderate')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-cyan-400 rounded"></div>
                  <span>{t('common.good', 'Good')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>{t('common.high', 'High')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-blue-700 rounded"></div>
                  <span>{t('common.peak', 'Peak')}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EngagementHeatmap;


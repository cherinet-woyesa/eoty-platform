import React, { useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface EngagementHeatmapProps {
  videoDuration: number; // Total video duration in seconds
  watchData: Array<{
    timestamp: number; // Timestamp in video (0 to duration)
    watchCount: number; // Number of viewers at this timestamp
  }>;
  className?: string;
}

const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  videoDuration,
  watchData,
  className = ''
}) => {
  // Divide video into segments (e.g., 100 segments for a heatmap)
  const segments = 100;
  const segmentDuration = videoDuration / segments;

  // Aggregate watch data by segment
  const segmentData = useMemo(() => {
    const segmentsArray = Array(segments).fill(0).map((_, i) => ({
      startTime: i * segmentDuration,
      endTime: (i + 1) * segmentDuration,
      watchCount: 0
    }));

    // Aggregate watch counts into segments
    watchData.forEach(({ timestamp, watchCount }) => {
      const segmentIndex = Math.floor(timestamp / segmentDuration);
      if (segmentIndex >= 0 && segmentIndex < segments) {
        segmentsArray[segmentIndex].watchCount += watchCount;
      }
    });

    return segmentsArray;
  }, [watchData, segmentDuration, segments]);

  // Find max watch count for normalization
  const maxWatchCount = Math.max(...segmentData.map(s => s.watchCount), 1);

  // Calculate engagement metrics
  const metrics = useMemo(() => {
    const totalWatches = segmentData.reduce((sum, s) => sum + s.watchCount, 0);
    const avgWatchCount = totalWatches / segments;
    const peakSegment = segmentData.reduce((max, s) => 
      s.watchCount > max.watchCount ? s : max, segmentData[0]
    );
    const lowSegment = segmentData.reduce((min, s) => 
      s.watchCount < min.watchCount ? s : min, segmentData[0]
    );

    // Calculate drop-off points (where watch count drops significantly)
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
    if (maxCount === 0) return 'bg-slate-200';
    const intensity = watchCount / maxCount;
    
    // Light color scheme: beige to neon green
    if (intensity >= 0.8) return 'bg-[#39FF14]'; // High engagement - neon green
    if (intensity >= 0.6) return 'bg-[#00FF41]'; // Good engagement
    if (intensity >= 0.4) return 'bg-[#FFD700]'; // Moderate - gold
    if (intensity >= 0.2) return 'bg-[#F5E6D3]'; // Low - light beige
    return 'bg-slate-200'; // Very low - grey
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-700 flex items-center mb-2">
          <TrendingUp className="h-5 w-5 mr-2 text-[#39FF14]" />
          Engagement Heatmap
        </h3>
        <p className="text-sm text-slate-600">
          Visual representation of where viewers watch most in your video
        </p>
      </div>

      {/* Heatmap Visualization */}
      <div className="mb-6">
        <div className="flex items-center space-x-1 mb-2">
          {segmentData.map((segment, index) => {
            const color = getHeatColor(segment.watchCount, maxWatchCount);
            return (
              <div
                key={index}
                className={`flex-1 h-8 ${color} rounded-sm transition-all duration-200 hover:opacity-80 cursor-pointer border border-slate-300/30`}
                title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${segment.watchCount} views`}
              />
            );
          })}
        </div>
        
        {/* Time markers */}
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>0:00</span>
          <span>{formatTime(videoDuration / 4)}</span>
          <span>{formatTime(videoDuration / 2)}</span>
          <span>{formatTime(3 * videoDuration / 4)}</span>
          <span>{formatTime(videoDuration)}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#39FF14]/10 to-[#00FF41]/10 rounded-lg p-4 border border-[#39FF14]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Peak Engagement</span>
            <TrendingUp className="h-4 w-4 text-[#39FF14]" />
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatTime(metrics.peakSegment.startTime)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {metrics.peakSegment.watchCount} viewers
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#F5E6D3]/10 rounded-lg p-4 border border-[#FFD700]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Average Engagement</span>
            <Clock className="h-4 w-4 text-[#FFD700]" />
          </div>
          <div className="text-lg font-bold text-slate-800">
            {metrics.avgWatchCount.toFixed(1)} viewers
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Per segment
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-200/50 to-slate-300/50 rounded-lg p-4 border border-slate-300/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Low Engagement</span>
            <TrendingDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-lg font-bold text-slate-800">
            {formatTime(metrics.lowSegment.startTime)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {metrics.lowSegment.watchCount} viewers
          </div>
        </div>
      </div>

      {/* Drop-off Points */}
      {metrics.dropOffPoints.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">
            ⚠️ Potential Drop-off Points
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
            Consider reviewing these sections to improve engagement
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Legend:</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-slate-200 rounded"></div>
              <span>Very Low</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-[#F5E6D3] rounded"></div>
              <span>Low</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-[#FFD700] rounded"></div>
              <span>Moderate</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-[#00FF41] rounded"></div>
              <span>Good</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-[#39FF14] rounded"></div>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementHeatmap;


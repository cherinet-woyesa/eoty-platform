import React, { useState, useEffect } from 'react';
import { Play, Clock, BookOpen, ExternalLink } from 'lucide-react';
import { relatedVideosApi, type RelatedVideo } from '@/services/api';
import { formatTime } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface RelatedVideosProps {
  lessonId: string;
  currentCourseId?: string;
  onVideoSelect?: (video: RelatedVideo) => void;
}

const RelatedVideos: React.FC<RelatedVideosProps> = ({
  lessonId,
  currentCourseId,
  onVideoSelect
}) => {
  const navigate = useNavigate();
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadRelatedVideos();
    }
  }, [lessonId]);

  const loadRelatedVideos = async () => {
    setLoading(true);
    try {
      const data = await relatedVideosApi.getRelatedVideos(lessonId, 6);
      setRelatedVideos(data.relatedVideos);
      setCurrentCourse(data.currentCourse);
    } catch (error) {
      console.error('Failed to load related videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: RelatedVideo) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    } else {
      // Navigate to the video
      if (video.course_id && video.course_id.toString() !== currentCourseId) {
        navigate(`/student/courses/${video.course_id}?lesson=${video.id}`);
      } else if (currentCourseId) {
        navigate(`/student/courses/${currentCourseId}?lesson=${video.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (relatedVideos.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center space-x-2">
        <BookOpen className="h-5 w-5 text-slate-600" />
        <span>Related Videos</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedVideos.map((video) => (
          <button
            key={video.id}
            onClick={() => handleVideoClick(video)}
            className="group text-left bg-slate-50/50 rounded-lg border border-slate-200/50 hover:border-[#4FC3F7]/50 hover:shadow-md transition-all overflow-hidden"
          >
            <div className="relative aspect-video bg-slate-200">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect fill="%23e2e8f0" width="640" height="360"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="16"%3EVideo%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                  <Play className="h-12 w-12 text-slate-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(video.duration)}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-slate-700 text-sm line-clamp-2 mb-1 group-hover:text-[#4FC3F7] transition-colors">
                {video.title}
              </h4>
              {video.course_title && video.course_id?.toString() !== currentCourseId && (
                <p className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>{video.course_title}</span>
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedVideos;


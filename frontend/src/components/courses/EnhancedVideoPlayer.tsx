// frontend/src/components/courses/EnhancedVideoPlayer.tsx
import * as React from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  RotateCcw, Bookmark, MessageCircle, PenTool,
  CheckCircle, X, AlertCircle, Clock, Send,
  Loader, BookOpen, Subtitles, Settings, WifiOff, Info,
  Zap, Sparkles, Target, Users, Eye, EyeOff,
  Download, Share2, Heart, Flag, MoreVertical,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  Award, Crown, Star, TrendingUp, BarChart3,
  PictureInPicture, Volume1, ChevronRight,
  // NEW: Added icons for enhanced features
  Monitor, Cast, Wifi, Gauge, Scissors,
  Edit3, Users2, BarChart, FileText,
  SkipBack, SkipForward, FastForward, Rewind,
  Grid, List, ZoomIn, ZoomOut
} from 'lucide-react';
import { interactiveApi } from '../../services/api';
import { videoApi } from '../../services/api/videos';
import QuizInterface from './QuizInterface';

interface EnhancedVideoPlayerProps {
  videoUrl: string;
  title?: string;
  lessonId: string;
  autoPlay?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  courseTitle?: string;
  chapterTitle?: string;
  // NEW: Enhanced props
  onQualityChange?: (quality: string) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onError?: (error: Error) => void;
  onLoad?: (metadata: any) => void;
}

interface Annotation {
  id: string;
  user_id: string;
  lesson_id: string;
  timestamp: number;
  content: string;
  type: 'highlight' | 'comment' | 'bookmark';
  metadata: any;
  is_public: boolean;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

interface Discussion {
  id: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  content: string;
  video_timestamp: number | null;
  is_pinned: boolean;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  replies: Discussion[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  lesson_id: string;
  order_number: number;
  time_limit: number | null;
  max_attempts: number;
  is_published: boolean;
  user_attempt: any;
}

interface Subtitle {
  id: string;
  language_code: string;
  language_name: string;
  subtitle_url: string;
}

// NEW: Enhanced video quality interface
interface VideoQuality {
  name: string;
  label: string;
  bitrate: number;
  resolution: string;
  url?: string;
}

// NEW: Video statistics interface
interface VideoStats {
  buffered: number;
  droppedFrames: number;
  networkActivity: number;
  currentBitrate: number;
  averageBitrate: number;
}

// Enhanced Discussion Post Component
const EnhancedDiscussionPost: React.FC<{
  discussion: Discussion;
  newReply: { [key: string]: string };
  setNewReply: (replies: any) => void;
  createReply: (parentId: string, content: string) => void;
  handleAnnotationClick: (timestamp: number) => void;
  formatTime: (seconds: number) => string;
  getUserInitials: (user: any) => string;
  currentUserId: string;
  userRole: string;
  openReportModal: (postId: string) => void;
}> = ({
  discussion, newReply, setNewReply, createReply, handleAnnotationClick,
  formatTime, getUserInitials, currentUserId, userRole, openReportModal
}) => {
  const [showReplies, setShowReplies] = React.useState(true);
  const [likes, setLikes] = React.useState(12);
  const [userLiked, setUserLiked] = React.useState(false);

  const handleLike = () => {
    setLikes(prev => userLiked ? prev - 1 : prev + 1);
    setUserLiked(!userLiked);
  };

  return (
    <div className="bg-gray-750 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {getUserInitials(discussion)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white text-sm">
                {discussion.first_name} {discussion.last_name}
              </span>
              {discussion.is_pinned && (
                <span className="bg-yellow-500 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                  Pinned
                </span>
              )}
              {userRole === 'teacher' && (
                <span className="bg-blue-500 text-blue-900 text-xs px-2 py-0.5 rounded-full font-medium">
                  Teacher
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
              {discussion.video_timestamp && (
                <button
                  onClick={() => handleAnnotationClick(discussion.video_timestamp!)}
                  className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                >
                  <Play className="h-3 w-3" />
                  <span>{formatTime(discussion.video_timestamp)}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-600 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-200 text-sm leading-relaxed mb-3">
        {discussion.content}
      </p>

      {/* Engagement Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 transition-colors ${
              userLiked ? 'text-red-500' : 'hover:text-red-400'
            }`}
          >
            <Heart className={`h-4 w-4 ${userLiked ? 'fill-current' : ''}`} />
            <span>{likes}</span>
          </button>

          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{discussion.replies?.length || 0} replies</span>
          </button>
        </div>

        {/* Report Button */}
        {discussion.user_id !== currentUserId && (
          <button
            onClick={() => openReportModal(discussion.id)}
            className="text-gray-400 hover:text-red-400 transition-colors flex items-center space-x-1"
            title="Report inappropriate content"
          >
            <Flag className="h-3 w-3" />
            <span>Report</span>
          </button>
        )}
      </div>

      {/* Replies */}
      {showReplies && discussion.replies && discussion.replies.length > 0 && (
        <div className="ml-4 space-y-3 border-l-2 border-gray-600 pl-4">
          {discussion.replies.map((reply) => (
            <div key={reply.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {getUserInitials(reply)}
                  </div>
                  <span className="font-medium text-white text-sm">
                    {reply.first_name} {reply.last_name}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(reply.created_at).toLocaleDateString()}
                  </span>
                </div>

                {reply.user_id !== currentUserId && (
                  <button
                    onClick={() => openReportModal(reply.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Report"
                  >
                    <Flag className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      <div className="mt-3 flex space-x-2">
        <input
          type="text"
          placeholder="Write a reply..."
          value={newReply[discussion.id] || ''}
          onChange={(e) => setNewReply(prev => ({
            ...prev,
            [discussion.id]: e.target.value
          }))}
          className="flex-1 bg-gray-600 text-white text-sm border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && newReply[discussion.id]?.trim()) {
              createReply(discussion.id, newReply[discussion.id]);
            }
          }}
        />
        <button
          onClick={() => createReply(discussion.id, newReply[discussion.id] || '')}
          disabled={!newReply[discussion.id]?.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-1"
        >
          <Send className="h-4 w-4" />
          <span>Reply</span>
        </button>
      </div>
    </div>
  );
};

// Enhanced Annotations Tab Component
const EnhancedAnnotationsTab: React.FC<{
  annotations: Annotation[];
  loading: boolean;
  showAnnotations: boolean;
  setShowAnnotations: (show: boolean) => void;
  handleAnnotationClick: (timestamp: number) => void;
  formatTime: (seconds: number) => string;
}> = ({ annotations, loading, showAnnotations, setShowAnnotations, handleAnnotationClick, formatTime }) => {
  const [filter, setFilter] = React.useState<'all' | 'highlight' | 'comment' | 'bookmark'>('all');

  const filteredAnnotations = annotations.filter(annotation =>
    filter === 'all' || annotation.type === filter
  );

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'highlight': return <PenTool className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      case 'bookmark': return <Bookmark className="h-4 w-4" />;
      default: return <PenTool className="h-4 w-4" />;
    }
  };

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'text-blue-400 bg-blue-400 bg-opacity-20 border-blue-400';
      case 'comment': return 'text-green-400 bg-green-400 bg-opacity-20 border-green-400';
      case 'bookmark': return 'text-purple-400 bg-purple-400 bg-opacity-20 border-purple-400';
      default: return 'text-gray-400 bg-gray-400 bg-opacity-20 border-gray-400';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-white text-lg">Your Annotations</h5>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Show on video:</span>
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showAnnotations ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showAnnotations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {['all', 'highlight', 'comment', 'bookmark'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as any)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
              filter === type
                ? getAnnotationColor(type)
                : 'text-gray-400 bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {getAnnotationIcon(type)}
            <span>{type}</span>
            <span className="bg-gray-500 text-gray-200 px-1.5 py-0.5 rounded text-xs">
              {annotations.filter(a => type === 'all' || a.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {/* Annotations List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
          <p className="text-gray-400">Loading annotations...</p>
        </div>
      ) : filteredAnnotations.length > 0 ? (
        <div className="space-y-3">
          {filteredAnnotations.map(annotation => (
            <div
              key={annotation.id}
              className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-700 transition-all duration-200 group ${
                annotation.type === 'highlight' ? 'border-blue-400' :
                annotation.type === 'comment' ? 'border-green-400' :
                'border-purple-400'
              }`}
              onClick={() => handleAnnotationClick(annotation.timestamp)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded ${
                    annotation.type === 'highlight' ? 'bg-blue-400 bg-opacity-20' :
                    annotation.type === 'comment' ? 'bg-green-400 bg-opacity-20' :
                    'bg-purple-400 bg-opacity-20'
                  }`}>
                    {getAnnotationIcon(annotation.type)}
                  </div>
                  <span className={`text-xs font-medium ${
                    annotation.type === 'highlight' ? 'text-blue-400' :
                    annotation.type === 'comment' ? 'text-green-400' :
                    'text-purple-400'
                  }`}>
                    {annotation.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(annotation.timestamp)}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Delete annotation', annotation.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400 hover:bg-opacity-20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{annotation.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {annotation.is_public ? 'Public' : 'Private'}
                </span>
                {annotation.user && (
                  <span className="text-xs text-gray-400">
                    By {annotation.user.first_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <PenTool className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium mb-1">No annotations yet</p>
          <p className="text-xs">Add highlights, comments, and bookmarks as you watch</p>
        </div>
      )}
    </div>
  );
};

// Enhanced Resources Tab Component
const EnhancedResourcesTab: React.FC = () => {
  const resources = [
    { id: 1, name: 'Course Slides PDF', type: 'pdf', size: '2.4 MB', downloads: 124 },
    { id: 2, name: 'Reference Materials', type: 'zip', size: '5.1 MB', downloads: 89 },
    { id: 3, name: 'Additional Reading', type: 'doc', size: '1.2 MB', downloads: 67 },
    { id: 4, name: 'Practice Exercises', type: 'pdf', size: '3.7 MB', downloads: 203 },
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'zip': return '📦';
      case 'doc': return '📝';
      default: return '📎';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-white text-lg">Lesson Resources</h5>
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          {resources.length} files
        </span>
      </div>

      <div className="space-y-3">
        {resources.map(resource => (
          <div key={resource.id} className="bg-gray-750 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(resource.type)}</span>
                <div>
                  <div className="font-medium text-white text-sm">{resource.name}</div>
                  <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                    <span>{resource.type.toUpperCase()}</span>
                    <span>•</span>
                    <span>{resource.size}</span>
                    <span>•</span>
                    <span>{resource.downloads} downloads</span>
                  </div>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-400 hover:bg-opacity-20 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700 pt-4">
        <button className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center space-x-2">
          <Download className="h-4 w-4" />
          <span className="text-sm font-medium">Download All Resources</span>
        </button>
      </div>
    </div>
  );
};

// NEW: Enhanced Video Statistics Component
const VideoStatistics: React.FC<{
  stats: VideoStats;
  isVisible: boolean;
}> = ({ stats, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 z-30">
      <div className="font-semibold mb-2">Video Stats</div>
      <div>Buffered: {stats.buffered.toFixed(1)}s</div>
      <div>Current Bitrate: {(stats.currentBitrate / 1000000).toFixed(1)} Mbps</div>
      <div>Avg Bitrate: {(stats.averageBitrate / 1000000).toFixed(1)} Mbps</div>
      <div>Dropped Frames: {stats.droppedFrames}</div>
      <div>Network Activity: {stats.networkActivity}%</div>
    </div>
  );
};

// NEW: Enhanced Quality Selector Component
const QualitySelector: React.FC<{
  qualities: VideoQuality[];
  currentQuality: string;
  onQualityChange: (quality: string) => void;
  isVisible: boolean;
}> = ({ qualities, currentQuality, onQualityChange, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-16 right-4 bg-black/90 text-white p-3 rounded-lg z-30 min-w-32">
      <div className="font-semibold mb-2 text-sm">Quality</div>
      {qualities.map(quality => (
        <button
          key={quality.name}
          onClick={() => onQualityChange(quality.name)}
          className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${
            currentQuality === quality.name ? 'text-blue-400 font-medium' : 'text-gray-300'
          }`}
        >
          {quality.label}
        </button>
      ))}
    </div>
  );
};

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoUrl,
  title,
  lessonId,
  autoPlay = false,
  onTimestampClick,
  courseTitle,
  chapterTitle,
  // NEW: Enhanced props
  onQualityChange,
  onPlaybackRateChange,
  onFullscreenChange,
  onError,
  onLoad
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hlsRef = React.useRef<Hls | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Core video states
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [videoQuality, setVideoQuality] = React.useState('auto');
  const [showAnnotations, setShowAnnotations] = React.useState(true);
  const [showQuiz, setShowQuiz] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'discussions' | 'annotations' | 'resources'>('discussions');

  // Real data states
  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
  const [discussions, setDiscussions] = React.useState<Discussion[]>([]);
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [subtitles, setSubtitles] = React.useState<Subtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState({
    annotations: false,
    discussions: false,
    quizzes: false,
    subtitles: false
  });
  const [newDiscussion, setNewDiscussion] = React.useState('');
  const [newReply, setNewReply] = React.useState<{ [key: string]: string }>({});

  // NEW: Enhanced states for production features
  const [networkStatus, setNetworkStatus] = React.useState<{
    status: 'online' | 'offline' | 'reconnecting' | 'degraded';
    speed?: number;
    retryCount: number;
  }>({ status: 'online', retryCount: 0 });
  
  const [videoStats, setVideoStats] = React.useState<VideoStats>({
    buffered: 0,
    droppedFrames: 0,
    networkActivity: 0,
    currentBitrate: 0,
    averageBitrate: 0
  });

  const [availableQualities, setAvailableQualities] = React.useState<VideoQuality[]>([
    { name: 'auto', label: 'Auto', bitrate: 0, resolution: 'Auto' },
    { name: '1080p', label: '1080p', bitrate: 5000000, resolution: '1920x1080' },
    { name: '720p', label: '720p', bitrate: 2500000, resolution: '1280x720' },
    { name: '480p', label: '480p', bitrate: 1000000, resolution: '854x480' },
    { name: '360p', label: '360p', bitrate: 600000, resolution: '640x360' }
  ]);

  const [showAdvancedControls, setShowAdvancedControls] = React.useState(false);
  const [showVideoStats, setShowVideoStats] = React.useState(false);
  const [showQualitySelector, setShowQualitySelector] = React.useState(false);
  const [theaterMode, setTheaterMode] = React.useState(false);
  const [pictureInPicture, setPictureInPicture] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [playbackHistory, setPlaybackHistory] = React.useState<number[]>([]);
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  // Quiz states
  const [showQuizTaking, setShowQuizTaking] = React.useState(false);
  const [quizResults, setQuizResults] = React.useState<any>(null);

  // Modal states
  const [showAnnotationModal, setShowAnnotationModal] = React.useState(false);
  const [annotationType, setAnnotationType] = React.useState<'highlight' | 'comment' | 'bookmark'>('comment');
  const [annotationContent, setAnnotationContent] = React.useState('');
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);
  const [reportReason, setReportReason] = React.useState<'inappropriate' | 'spam' | 'harassment' | 'offensive' | 'other'>('inappropriate');

  // User context (in real app, this would come from context)
  const userRole: 'student' | 'teacher' | 'admin' = 'student';
  const currentUserId = 'current-user-id';

  // NEW: Enhanced video URL resolution with signed URLs
  const [resolvedVideoUrl, setResolvedVideoUrl] = React.useState(videoUrl);
  const [isHls, setIsHls] = React.useState(false);

  // NEW: Enhanced HLS.js integration with error handling
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeVideo = async () => {
      try {
        // Fetch video metadata to get signed URL and processing status
        const metadata = await videoApi.getLessonMetadata(lessonId);
        
        if (metadata.success && metadata.data?.lesson) {
          const lesson = metadata.data.lesson;
          
          // Use signed URL if available, otherwise fallback
          const finalUrl = lesson.signedStreamUrl || lesson.video_url || videoUrl;
          setResolvedVideoUrl(finalUrl);
          setIsHls(finalUrl.includes('.m3u8'));

          // Call onLoad callback with metadata
          onLoad?.(metadata.data);
        } else {
          setResolvedVideoUrl(videoUrl);
          setIsHls(videoUrl.includes('.m3u8'));
        }
      } catch (error) {
        console.error('Failed to fetch video metadata:', error);
        setResolvedVideoUrl(videoUrl);
        setIsHls(videoUrl.includes('.m3u8'));
      }
    };

    initializeVideo();
  }, [lessonId, videoUrl, onLoad]);

  // NEW: Enhanced HLS.js integration with robust error handling
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) return;

    let hls: Hls | null = null;

    const setupHls = () => {
      if (isHls) {
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000, // 60MB
            maxBufferHole: 0.5,
            maxFragLookUpTolerance: 0.2,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            // Enhanced error handling
            debug: false,
            enableSoftwareAES: true,
            startLevel: -1, // Auto quality
          });

          hls.loadSource(resolvedVideoUrl);
          hls.attachMedia(video);

          // Enhanced HLS event handling
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed successfully');
            setNetworkStatus({ status: 'online', retryCount: 0 });
          });

          hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            const level = data.level;
            setVideoStats(prev => ({
              ...prev,
              currentBitrate: level.bitrate,
              averageBitrate: (prev.averageBitrate + level.bitrate) / 2
            }));
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error encountered, trying to recover...');
                  hls?.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error encountered, trying to recover...');
                  hls?.recoverMediaError();
                  break;
                default:
                  console.log('Fatal HLS error, cannot recover');
                  handleVideoError(new Error('Fatal HLS error: ' + data.details));
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = resolvedVideoUrl;
        } else {
          throw new Error('HLS is not supported in this browser');
        }
      } else {
        // Standard video source
        video.src = resolvedVideoUrl;
      }
    };

    const handleVideoError = (error: Error) => {
      console.error('Video error:', error);
      setVideoError(error.message);
      setNetworkStatus(prev => ({
        status: 'offline',
        retryCount: prev.retryCount + 1
      }));
      onError?.(error);
    };

    try {
      setupHls();
    } catch (error) {
      handleVideoError(error as Error);
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedVideoUrl, isHls, onError]);

  // NEW: Enhanced video event handlers
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      const newDuration = video.duration || 0;
      setDuration(newDuration);
    };
    
    const handleEnd = () => setIsPlaying(false);
    
    const handleError = (e: Event) => {
      const videoElement = e.target as HTMLVideoElement;
      const error = videoElement.error;
      let errorMessage = 'Unknown video error';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding error';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported';
            break;
        }
      }
      
      setVideoError(errorMessage);
      onError?.(new Error(errorMessage));
    };

    const handleLoadStart = () => {
      setNetworkStatus({ status: 'online', retryCount: 0 });
      setVideoError(null);
    };

    const handleCanPlay = () => {
      setNetworkStatus({ status: 'online', retryCount: 0 });
    };

    const handleWaiting = () => {
      setNetworkStatus(prev => ({ ...prev, status: 'degraded' }));
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1) - video.currentTime;
        setVideoStats(prev => ({ ...prev, buffered }));
      }
    };

    // Enhanced event listeners
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnd);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnd);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('progress', handleProgress);
    };
  }, [onError]);

  // NEW: Enhanced network status monitoring
  React.useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, status: 'online' }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data from backend
  React.useEffect(() => {
    loadAnnotations();
    loadDiscussions();
    loadQuizzes();
    loadSubtitles();
  }, [lessonId]);

  // NEW: Enhanced progress tracking with analytics
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (duration > 0 && currentTime > 0) {
        const progress = currentTime / duration;
        
        // Update playback history for heatmap
        setPlaybackHistory(prev => {
          const newHistory = [...prev, currentTime];
          // Keep only last 1000 points for performance
          return newHistory.slice(-1000);
        });

        // Auto-save progress
        interactiveApi.updateLessonProgress(lessonId, {
          progress,
          lastWatchedTimestamp: currentTime,
          isCompleted: progress >= 0.95
        }).catch(console.error);
      }
    }, 10000); // Save every 10 seconds

    return () => {
      clearInterval(interval);
      // Final save on unmount
      if (duration > 0 && currentTime > 0) {
        const progress = currentTime / duration;
        interactiveApi.updateLessonProgress(lessonId, {
          progress,
          lastWatchedTimestamp: currentTime,
          isCompleted: progress >= 0.95
        }).catch(console.error);
      }
    };
  }, [currentTime, duration, lessonId]);

  // NEW: Enhanced keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'c':
          e.preventDefault();
          toggleSubtitles();
          break;
        case 't':
          e.preventDefault();
          setTheaterMode(!theaterMode);
          break;
        case 'i':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case 's':
          e.preventDefault();
          setShowVideoStats(!showVideoStats);
          break;
        case 'q':
          e.preventDefault();
          setShowQualitySelector(!showQualitySelector);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percentage = parseInt(e.key) / 10;
          seekTo(percentage * duration);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, theaterMode, duration]);

  // NEW: Enhanced API functions with error handling
  const loadSubtitles = async () => {
    setLoading(prev => ({ ...prev, subtitles: true }));
    try {
      const response = await videoApi.getLessonMetadata(lessonId);
      if (response.success) {
        setSubtitles(response.data.subtitles || []);
      }
    } catch (error) {
      console.error('Failed to load subtitles:', error);
    } finally {
      setLoading(prev => ({ ...prev, subtitles: false }));
    }
  };

  const loadAnnotations = async () => {
    setLoading(prev => ({ ...prev, annotations: true }));
    try {
      const response = await interactiveApi.getLessonAnnotations(lessonId);
      if (response.success) {
        setAnnotations(response.data.annotations);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoading(prev => ({ ...prev, annotations: false }));
    }
  };

  const loadDiscussions = async () => {
    setLoading(prev => ({ ...prev, discussions: true }));
    try {
      const response = await interactiveApi.getLessonDiscussions(lessonId);
      if (response.success) {
        setDiscussions(response.data.posts);
      }
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setLoading(prev => ({ ...prev, discussions: false }));
    }
  };

  const loadQuizzes = async () => {
    setLoading(prev => ({ ...prev, quizzes: true }));
    try {
      const response = await interactiveApi.getLessonQuizzes(lessonId);
      if (response.success) {
        setQuizzes(response.data.quizzes);
      }
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setLoading(prev => ({ ...prev, quizzes: false }));
    }
  };

  // NEW: Enhanced video control functions
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (videoError) {
      await handleRetry();
      return;
    }

    try {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        await video.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setVideoError('Failed to play video');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime += seconds;
      setCurrentTime(video.currentTime);
    }
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handlePlaybackRate = () => {
    const video = videoRef.current;
    if (!video) return;

    const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    video.playbackRate = newRate;
    setPlaybackRate(newRate);
    onPlaybackRateChange?.(newRate);
  };

  const handleQualityChange = (quality: string) => {
    setVideoQuality(quality);
    setShowQualitySelector(false);
    onQualityChange?.(quality);

    // If using HLS.js, change quality level
    if (hlsRef.current && isHls) {
      const levels = hlsRef.current.levels;
      const levelIndex = levels.findIndex(level => 
        quality === 'auto' ? true : level.height === parseInt(quality)
      );
      
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = quality === 'auto' ? -1 : levelIndex;
      }
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }).catch(console.error);
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPictureInPicture(false);
      } else {
        await video.requestPictureInPicture();
        setPictureInPicture(true);
      }
    } catch (error) {
      console.error('Picture-in-Picture failed:', error);
    }
  };

  const toggleTheaterMode = () => {
    setTheaterMode(!theaterMode);
  };

  const toggleSubtitles = () => {
    if (subtitles.length > 0) {
      const nextIndex = selectedSubtitle
        ? (subtitles.findIndex(s => s.id === selectedSubtitle) + 1) % (subtitles.length + 1)
        : 0;
      handleSubtitleSelect(nextIndex < subtitles.length ? subtitles[nextIndex].id : null);
    }
  };

  const handleSubtitleSelect = (subtitleId: string | null) => {
    setSelectedSubtitle(subtitleId);
    // Implementation would depend on your video player setup
  };

  // NEW: Enhanced error recovery
  const handleRetry = async () => {
    setNetworkStatus(prev => ({ ...prev, status: 'reconnecting' }));
    
    try {
      // Reload video source
      const video = videoRef.current;
      if (video) {
        video.load();
        await video.play();
        setVideoError(null);
        setNetworkStatus({ status: 'online', retryCount: 0 });
      }
    } catch (error) {
      console.error('Retry failed:', error);
      setNetworkStatus(prev => ({ ...prev, status: 'offline' }));
    }
  };

  // NEW: Enhanced sharing
  const handleShare = async (platform?: string) => {
    const shareUrl = window.location.href;
    const shareText = `Watch "${title}" on EOTY Platform`;

    try {
      if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl);
        // Show success message
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // Show success message
      }
    } catch (error) {
      console.log('Sharing cancelled or failed:', error);
    } finally {
      setShowShareMenu(false);
    }
  };

  // Existing annotation and discussion functions (keep your current implementation)
  const createAnnotation = async (type: 'highlight' | 'comment' | 'bookmark', content: string = '') => {
    if (type !== 'bookmark' && !content.trim()) {
      alert('Please enter content for your annotation');
      return;
    }

    try {
      await interactiveApi.createAnnotation({
        lessonId,
        timestamp: currentTime,
        content: content || `Bookmark at ${formatTime(currentTime)}`,
        type,
        metadata: { color: getAnnotationColor(type) },
        isPublic: type !== 'bookmark'
      });
      loadAnnotations();
      setShowAnnotationModal(false);
      setAnnotationContent('');
    } catch (error) {
      console.error('Failed to create annotation:', error);
      alert('Failed to create annotation. Please try again.');
    }
  };

  const createDiscussion = async () => {
    if (!newDiscussion.trim()) return;

    try {
      await interactiveApi.createDiscussionPost({
        lessonId,
        content: newDiscussion,
        videoTimestamp: currentTime
      });
      setNewDiscussion('');
      loadDiscussions();
    } catch (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to create discussion. Please try again.');
    }
  };

  const createReply = async (parentId: string, content: string) => {
    if (!content.trim()) return;

    try {
      await interactiveApi.createDiscussionPost({
        lessonId,
        content,
        parentId
      });
      setNewReply(prev => ({ ...prev, [parentId]: '' }));
      loadDiscussions();
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to create reply. Please try again.');
    }
  };

  const reportDiscussionPost = async (postId: string, reason: 'inappropriate' | 'spam' | 'harassment' | 'offensive' | 'other') => {
    try {
      const response = await interactiveApi.reportDiscussionPost(postId, reason);
      if (response.success) {
        alert('Post reported successfully. Our moderators will review it.');
      } else {
        alert('Failed to report post. Please try again.');
      }
    } catch (error) {
      console.error('Failed to report post:', error);
      alert('Failed to report post. Please try again.');
    }
  };

  const openReportModal = (postId: string) => {
    setReportPostId(postId);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (reportPostId) {
      await reportDiscussionPost(reportPostId, reportReason);
      setShowReportModal(false);
      setReportPostId(null);
      setReportReason('inappropriate');
    }
  };

  // Quiz functions
  const handleStartQuiz = () => {
    setShowQuizTaking(true);
    setShowQuiz(false);
  };

  const handleQuizComplete = (results: any) => {
    setShowQuizTaking(false);
    setQuizResults(results);
  };

  const handleCloseQuiz = () => {
    setShowQuizTaking(false);
    setQuizResults(null);
  };

  // Utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'highlight': return '#3B82F6';
      case 'comment': return '#10B981';
      case 'bookmark': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getUserInitials = (user: any) => {
    return `${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`.toUpperCase();
  };

  const handleAnnotationClick = (timestamp: number) => {
    seekTo(timestamp);
    onTimestampClick?.(timestamp);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // NEW: Generate heatmap data
  const generateHeatmap = () => {
    const heatmap = new Array(Math.ceil(duration)).fill(0);
    playbackHistory.forEach(time => {
      const index = Math.floor(time);
      if (index < heatmap.length) {
        heatmap[index]++;
      }
    });
    return heatmap;
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-900 rounded-2xl overflow-hidden transition-all duration-300 ${
        theaterMode ? 'fixed inset-0 z-50 rounded-none' : 'border border-gray-700'
      }`}
    >
      <div className="relative w-full" style={{ paddingTop: theaterMode ? '0' : '56.25%' }}>
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-contain bg-black"
          crossOrigin="anonymous"
          controls={false}
          preload="metadata"
          playsInline
          webkit-playsinline
        >
          {subtitles.map(sub => (
            <track
              key={sub.id}
              kind="subtitles"
              src={videoApi.resolveVideoUrl(sub.subtitle_url)}
              srcLang={sub.language_code}
              label={sub.language_name}
              default={selectedSubtitle === sub.id}
            />
          ))}
          Your browser does not support the video tag.
        </video>

        {/* NEW: Enhanced Video Statistics */}
        <VideoStatistics stats={videoStats} isVisible={showVideoStats} />

        {/* NEW: Quality Selector */}
        <QualitySelector
          qualities={availableQualities}
          currentQuality={videoQuality}
          onQualityChange={handleQualityChange}
          isVisible={showQualitySelector}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <button onClick={togglePlay} className="p-4 rounded-full bg-white bg-opacity-30 hover:bg-opacity-50 transition-all duration-200">
              <Play className="h-10 w-10 text-white" />
            </button>
          </div>
        )}

        {/* Top Controls (Title, Share) */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex-1 min-w-0">
            <h3 className="text-white text-lg font-semibold line-clamp-1">{title}</h3>
            {(courseTitle || chapterTitle) && (
              <div className="text-gray-300 text-sm line-clamp-1">
                {courseTitle && <span>{courseTitle}</span>}
                {chapterTitle && <span> • {chapterTitle}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* NEW: Stats Toggle */}
            <button
              onClick={() => setShowVideoStats(!showVideoStats)}
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Show Statistics"
            >
              <BarChart className="h-5 w-5" />
            </button>

            {/* NEW: Quality Toggle */}
            <button
              onClick={() => setShowQualitySelector(!showQualitySelector)}
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Quality Settings"
            >
              <Gauge className="h-5 w-5" />
            </button>

            {/* Share Button */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-xl z-30">
                  <button onClick={() => handleShare('copy')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                    Copy Link
                  </button>
                  {navigator.share && (
                    <button onClick={() => handleShare()} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                      Share via...
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-gradient-to-t from-black/70 to-transparent">
          {/* Progress Bar */}
          <div className="relative mb-3">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{ 
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #6B7280 ${progress}%, #6B7280 100%)` 
              }}
            />
            {showHeatmap && playbackHistory.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                {generateHeatmap().map((intensity, index) => (
                  <div
                    key={index}
                    className="flex-1"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity / Math.max(...generateHeatmap())})`,
                      height: '2px'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button onClick={togglePlay} className="text-white hover:text-gray-300" title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              
              <div className="flex items-center space-x-1">
                <button onClick={toggleMute} className="text-white hover:text-gray-300" title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : volume < 0.5 ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-500 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
              
              {/* NEW: Skip buttons */}
              <button onClick={() => seekRelative(-10)} className="text-white hover:text-gray-300" title="Rewind 10s">
                <Rewind className="h-4 w-4" />
              </button>
              <button onClick={() => seekRelative(10)} className="text-white hover:text-gray-300" title="Forward 10s">
                <FastForward className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* NEW: Theater mode */}
              <button onClick={toggleTheaterMode} className="text-white hover:text-gray-300" title="Theater Mode">
                <Monitor className="h-5 w-5" />
              </button>

              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={toggleSubtitles}
                    className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                    title="Subtitles"
                  >
                    <Subtitles className="h-5 w-5" />
                  </button>
                </div>
              )}
              
              <button onClick={handlePlaybackRate} className="text-white text-sm px-2 py-1 rounded hover:bg-white/20 transition-colors" title="Playback Speed">
                {playbackRate}x
              </button>
              
              <button onClick={togglePictureInPicture} className="text-white hover:text-gray-300" title="Picture in Picture">
                <PictureInPicture className="h-5 w-5" />
              </button>
              
              <button onClick={toggleFullscreen} className="text-white hover:text-gray-300" title="Fullscreen">
                <Maximize className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* NEW: Enhanced Network Status / Error Overlay */}
        {networkStatus.status !== 'online' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
            <div className="text-center text-white p-6 max-w-md">
              {networkStatus.status === 'offline' && (
                <>
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <h3 className="text-xl font-semibold mb-2">Connection Lost</h3>
                  <p className="mb-4 text-gray-300">Please check your internet connection and try again.</p>
                  <div className="flex space-x-3 justify-center">
                    <button onClick={handleRetry} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Retry
                    </button>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                      Reload Page
                    </button>
                  </div>
                </>
              )}
              {networkStatus.status === 'reconnecting' && (
                <>
                  <Loader className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-400" />
                  <h3 className="text-xl font-semibold mb-2">Reconnecting...</h3>
                  <p className="text-gray-300">Attempt {networkStatus.retryCount}</p>
                </>
              )}
              {videoError && (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <h3 className="text-xl font-semibold mb-2">Playback Error</h3>
                  <p className="mb-4 text-gray-300">{videoError}</p>
                  <button onClick={handleRetry} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rest of your existing UI components (Tabs, Discussions, Annotations, Resources, Modals) */}
      {/* ... Keep your existing tab structure and modal components ... */}
      {/* The tab structure and modal components from your original code remain the same */}

      {/* Tabs for Discussions, Annotations, Resources */}
      <div className="bg-gray-800 p-4">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('discussions')}
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'discussions' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Discussions ({discussions.length})
          </button>
          <button
            onClick={() => setActiveTab('annotations')}
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'annotations' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Annotations ({annotations.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'resources' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Resources
          </button>
          {quizzes.length > 0 && (
            <button
              onClick={() => setShowQuiz(true)}
              className="ml-auto py-2 px-4 text-sm font-medium text-purple-400 hover:text-purple-200 flex items-center"
            >
              <Zap className="h-4 w-4 mr-2" />
              Take Quiz
            </button>
          )}
        </div>

        <div className="mt-4">
          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {discussions.length > 0 ? (
                discussions.map(discussion => (
                  <EnhancedDiscussionPost
                    key={discussion.id}
                    discussion={discussion}
                    newReply={newReply}
                    setNewReply={setNewReply}
                    createReply={createReply}
                    handleAnnotationClick={handleAnnotationClick}
                    formatTime={formatTime}
                    getUserInitials={getUserInitials}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    openReportModal={openReportModal}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No discussions yet</p>
                  <p className="text-xs">Be the first to start a discussion!</p>
                </div>
              )}
              <div className="mt-4 flex space-x-2">
                <input
                  type="text"
                  placeholder="Start a new discussion..."
                  value={newDiscussion}
                  onChange={(e) => setNewDiscussion(e.target.value)}
                  className="flex-1 bg-gray-700 text-white text-sm border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newDiscussion.trim()) {
                      createDiscussion();
                    }
                  }}
                />
                <button
                  onClick={createDiscussion}
                  disabled={!newDiscussion.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-1"
                >
                  <Send className="h-4 w-4" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'annotations' && (
            <EnhancedAnnotationsTab
              annotations={annotations}
              loading={loading.annotations}
              showAnnotations={showAnnotations}
              setShowAnnotations={setShowAnnotations}
              handleAnnotationClick={handleAnnotationClick}
              formatTime={formatTime}
            />
          )}

          {activeTab === 'resources' && (
            <EnhancedResourcesTab />
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && quizzes.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl relative">
            <button
              onClick={() => setShowQuiz(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">Lesson Quiz: {quizzes[0].title}</h3>
            <p className="text-gray-300 mb-6">{quizzes[0].description}</p>
            <button
              onClick={handleStartQuiz}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}
{/* Quiz Taking Interface */}
      {showQuizTaking && quizzes.length > 0 && (
        <QuizInterface
          quizId={quizzes[0].id}
          onComplete={handleQuizComplete}
          onClose={handleCloseQuiz}
        />
      )}

{/* Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowAnnotationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">Add {annotationType}</h3>
            {annotationType !== 'bookmark' && (
              <textarea
                value={annotationContent}
                onChange={(e) => setAnnotationContent(e.target.value)}
                placeholder={`Enter your ${annotationType} here...`}
                rows={4}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <button
                          onClick={() => createAnnotation(annotationType, annotationContent)}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Add {annotationType}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Report Modal */}
                        {showReportModal && (
                          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md relative">
                              <button
                                onClick={() => setShowReportModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                              >
                                <X className="h-6 w-6" />
                              </button>
                              <h3 className="text-2xl font-bold text-white mb-4">Report Content</h3>
                              <p className="text-gray-300 mb-4">Please select a reason for reporting this post:</p>
                              <select
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value as any)}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="inappropriate">Inappropriate Content</option>
                                <option value="spam">Spam</option>
                                <option value="harassment">Harassment</option>
                                <option value="offensive">Offensive Language</option>
                                <option value="other">Other</option>
                              </select>
                              <button
                                            onClick={submitReport}
                                            className="w-full py-3 bg-red-600 text-white rounded-xl text-lg font-semibold hover:bg-red-700 transition-colors"
                                          >
                                            Submit Report
                                          </button>
                                        </div>
                                             
                                                </div>
                                              )}
    </div>
  );
};

export default EnhancedVideoPlayer;
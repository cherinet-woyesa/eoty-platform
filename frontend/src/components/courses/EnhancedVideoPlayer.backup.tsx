import * as React from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  RotateCcw, Bookmark, MessageCircle, PenTool,
  CheckCircle, X, AlertCircle, Clock, Send,
  Loader, BookOpen, Subtitles, Settings, WifiOff, Info
} from 'lucide-react';
import { interactiveApi } from '../../services/api';
import { videoApi } from '../../services/api/videos';
import QuizTakingInterface from './QuizTakingInterface';
import QuizResults from './QuizResults';

interface EnhancedVideoPlayerProps {
  videoUrl: string;
  title?: string;
  lessonId: string;
  autoPlay?: boolean;
  onTimestampClick?: (timestamp: number) => void;
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

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({ 
  videoUrl, 
  title, 
  lessonId,
  autoPlay = false,
  onTimestampClick 
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [videoQuality, setVideoQuality] = React.useState('hd'); // hd, sd, mobile
  const [showAnnotations, setShowAnnotations] = React.useState(true);
  const [showQuiz, setShowQuiz] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'discussions' | 'annotations' | 'quiz'>('discussions');
  
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
  const [networkError, setNetworkError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  // Quiz states
  const [showQuizTaking, setShowQuizTaking] = React.useState(false);
  const [selectedQuiz, setSelectedQuiz] = React.useState<string | null>(null);
  const [showQuizResults, setShowQuizResults] = React.useState(false);
  const [quizAttemptId, setQuizAttemptId] = React.useState<string | null>(null);
  const [quizResults, setQuizResults] = React.useState<any>(null);

  // New state for annotation creation
  const [showAnnotationModal, setShowAnnotationModal] = React.useState(false);
  const [annotationType, setAnnotationType] = React.useState<'highlight' | 'comment' | 'bookmark'>('comment');
  const [annotationContent, setAnnotationContent] = React.useState('');

  // Add user role state (in a real app, this would come from context or props)
  const userRole: 'student' | 'teacher' | 'admin' = 'student'; // This would be dynamically determined
  const currentUserId = 'current-user-id'; // This would come from auth context

  // Load data from backend
  React.useEffect(() => {
    loadAnnotations();
    loadDiscussions();
    loadQuizzes();
    loadVideoMetadata();
  }, [lessonId]);

  // Auto-save progress
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (duration > 0 && currentTime > 0) {
        const progress = currentTime / duration;
        interactiveApi.updateLessonProgress(lessonId, {
          progress,
          lastWatchedTimestamp: currentTime,
          isCompleted: progress >= 0.95 // Mark as completed when 95% watched
        }).catch(console.error);
      }
    }, 30000); // Save every 30 seconds

    // Also save progress when component unmounts
    return () => {
      clearInterval(interval);
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

  const loadVideoMetadata = async () => {
    setLoading(prev => ({ ...prev, subtitles: true }));
    try {
      // Since we don't have the getVideoMetadata function yet, we'll simulate it
      console.log('Loading video metadata for lesson:', lessonId);
      // In a real implementation, this would fetch actual subtitle data
    } catch (error) {
      console.error('Failed to load video metadata:', error);
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

  const createAnnotation = async (type: 'highlight' | 'comment' | 'bookmark', content: string = '') => {
    // For bookmarks, we don't need content
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
      loadAnnotations(); // Reload annotations
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
      loadDiscussions(); // Reload discussions
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
      loadDiscussions(); // Reload discussions
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to create reply. Please try again.');
    }
  };

  // Quiz functions
  const handleStartQuiz = (quizId: string) => {
    setSelectedQuiz(quizId);
    setShowQuizTaking(true);
    setShowQuiz(false);
  };

  const handleQuizComplete = async (attemptId: string) => {
    setShowQuizTaking(false);
    setQuizAttemptId(attemptId);
    
    try {
      // Load quiz results
      const response = await interactiveApi.getQuizResults(attemptId);
      if (response.success) {
        setQuizResults(response.data.attempt);
        setShowQuizResults(true);
      }
    } catch (error) {
      console.error('Failed to load quiz results:', error);
    }
  };

  const handleRetakeQuiz = () => {
    setShowQuizResults(false);
    setQuizResults(null);
    if (selectedQuiz) {
      setShowQuizTaking(true);
    }
  };

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'highlight': return '#3B82F6'; // Blue
      case 'comment': return '#10B981';  // Green
      case 'bookmark': return '#8B5CF6'; // Purple
      default: return '#6B7280';        // Gray
    }
  };

  const getUserInitials = (user: any) => {
    return `${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`.toUpperCase();
  };

  // Video control functions
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnd = () => setIsPlaying(false);
    const handleError = () => {
      setNetworkError(true);
      console.error('Video streaming error');
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnd);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnd);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
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

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const handleVideoQuality = () => {
    const qualities = ['hd', 'sd', 'mobile'];
    const currentIndex = qualities.indexOf(videoQuality);
    const nextIndex = (currentIndex + 1) % qualities.length;
    const newQuality = qualities[nextIndex];
    
    setVideoQuality(newQuality);
    // In a real implementation, this would reload the video with the new quality
    alert(`Video quality changed to ${newQuality.toUpperCase()}. In a production environment, this would switch to a different stream.`);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleAnnotationClick = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
    onTimestampClick?.(timestamp);
  };

  const handleRetry = () => {
    setNetworkError(false);
    setRetryCount(prev => prev + 1);
    // Reload the video
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleSubtitleSelect = (subtitleId: string | null) => {
    setSelectedSubtitle(subtitleId);
    // In a real implementation, this would load the subtitle track
    if (subtitleId) {
      const subtitle = subtitles.find(s => s.id === subtitleId);
      if (subtitle) {
        alert(`Subtitle selected: ${subtitle.language_name}. In a production environment, this would load the subtitle track.`);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Video Area - 3/4 width */}
        <div className="lg:col-span-3">
          <div className="relative bg-black">
            {/* Video Element */}
            <video
              ref={videoRef}
              src={`${videoUrl}?quality=${videoQuality}&retry=${retryCount}`}
              className="w-full aspect-video bg-black"
              autoPlay={autoPlay}
              onClick={togglePlay}
            />

            {/* Network Error Overlay */}
            {networkError && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-center text-white p-6">
                  <WifiOff className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Network Error</h3>
                  <p className="mb-4">Unable to stream video. Check your connection and try again.</p>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Annotation Markers on Progress Bar */}
            <div className="absolute bottom-16 left-0 right-0 px-4">
              <div className="relative h-2 bg-gray-600 rounded-lg">
                {/* Progress */}
                <div 
                  className="absolute h-full bg-blue-600 rounded-lg"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Annotation Markers */}
                {showAnnotations && annotations.map(annotation => (
                  <button
                    key={annotation.id}
                    className={`absolute w-3 h-3 rounded-full transform -translate-x-1.5 -translate-y-0.5 ${
                      annotation.type === 'highlight' ? 'bg-blue-500' :
                      annotation.type === 'comment' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`}
                    style={{ left: `${(annotation.timestamp / duration) * 100}%` }}
                    onClick={() => handleAnnotationClick(annotation.timestamp)}
                    title={`${annotation.type}: ${annotation.content}`}
                  />
                ))}
              </div>
            </div>

            {/* Annotation Creation Modal */}
            {showAnnotationModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl max-w-md w-full">
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Add {annotationType === 'highlight' ? 'Highlight' : 
                             annotationType === 'comment' ? 'Comment' : 'Bookmark'}
                      </h3>
                      <button
                        onClick={() => setShowAnnotationModal(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>At {formatTime(currentTime)}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    {annotationType !== 'bookmark' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {annotationType === 'highlight' ? 'Highlight Note' : 'Comment'}
                        </label>
                        <textarea
                          value={annotationContent}
                          onChange={(e) => setAnnotationContent(e.target.value)}
                          placeholder={annotationType === 'highlight' ? 'Add a note about this highlight...' : 'Enter your comment...'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Bookmark className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                        <p className="text-gray-600">
                          Create a bookmark at {formatTime(currentTime)} to easily return to this point later.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => setShowAnnotationModal(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => createAnnotation(annotationType, annotationContent)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {annotationType === 'bookmark' ? 'Create Bookmark' : 'Add Annotation'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Controls */}
            <div className="p-4 bg-gray-900">
              {/* Progress Bar */}
              <div className="flex items-center mb-4">
                <span className="text-white text-sm min-w-[50px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 mx-2 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <span className="text-white text-sm min-w-[50px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-gray-300 transition-colors duration-150"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-gray-300 transition-colors duration-150"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                  </div>

                  {/* Playback Speed */}
                  <button
                    onClick={handlePlaybackRate}
                    className="text-white hover:text-gray-300 transition-colors duration-150 text-sm font-medium"
                  >
                    {playbackRate}x
                  </button>

                  {/* Video Quality */}
                  <button
                    onClick={handleVideoQuality}
                    className="text-white hover:text-gray-300 transition-colors duration-150 text-sm font-medium"
                  >
                    {videoQuality.toUpperCase()}
                  </button>

                  {/* Subtitles */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (subtitles.length > 0) {
                          // Toggle subtitle selection
                          const nextIndex = selectedSubtitle 
                            ? (subtitles.findIndex(s => s.id === selectedSubtitle) + 1) % (subtitles.length + 1)
                            : 0;
                          handleSubtitleSelect(nextIndex < subtitles.length ? subtitles[nextIndex].id : null);
                        }
                      }}
                      className="text-white hover:text-gray-300 transition-colors duration-150"
                      title="Subtitles"
                    >
                      <Subtitles className="h-5 w-5" />
                    </button>
                    {selectedSubtitle && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {subtitles.find(s => s.id === selectedSubtitle)?.language_code.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Annotation Tools */}
                  <div className="flex items-center space-x-2 border-l border-gray-600 pl-4">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setAnnotationType('bookmark');
                          setShowAnnotationModal(true);
                        }}
                        className="text-white hover:text-yellow-400 transition-colors duration-150"
                        title="Add Bookmark"
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => {
                          setAnnotationType('highlight');
                          setShowAnnotationModal(true);
                        }}
                        className="text-white hover:text-blue-400 transition-colors duration-150"
                        title="Add Highlight"
                      >
                        <PenTool className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => {
                          setAnnotationType('comment');
                          setShowAnnotationModal(true);
                        }}
                        className="text-white hover:text-green-400 transition-colors duration-150"
                        title="Add Comment"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Quiz Button */}
                  {quizzes.length > 0 && (
                    <button
                      onClick={() => setShowQuiz(!showQuiz)}
                      className="text-white hover:text-green-400 transition-colors duration-150 flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Quiz ({quizzes.length})</span>
                    </button>
                  )}

                  {/* Restart */}
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        setCurrentTime(0);
                      }
                    }}
                    className="text-white hover:text-gray-300 transition-colors duration-150"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-gray-300 transition-colors duration-150"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Title */}
            {title && (
              <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
                <h3 className="text-white font-medium">{title}</h3>
              </div>
            )}
          </div>

          {/* Quiz Panel */}
          {showQuiz && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Lesson Quizzes</h4>
                <button
                  onClick={() => setShowQuiz(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {loading.quizzes ? (
                <div className="text-center py-8">
                  <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Loading quizzes...</p>
                </div>
              ) : quizzes.length > 0 ? (
                <div className="space-y-4">
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{quiz.title}</h5>
                          {quiz.description && (
                            <p className="text-gray-600 text-sm mt-1">{quiz.description}</p>
                          )}
                        </div>
                        {quiz.user_attempt && (
                          <div className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                            Score: {quiz.user_attempt.score}/{quiz.user_attempt.max_score}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>{quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''} allowed</span>
                        {quiz.time_limit && (
                          <span>Time limit: {Math.floor(quiz.time_limit / 60)} minutes</span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleStartQuiz(quiz.id)}
                        disabled={quiz.user_attempt?.is_completed && quiz.max_attempts <= 1}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        {quiz.user_attempt ? 'Retake Quiz' : 'Start Quiz'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No quizzes available for this lesson</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Sidebar - 1/4 width */}
        <div className="lg:col-span-1 border-l border-gray-200">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
                activeTab === 'discussions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab('annotations')}
              className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 ${
                activeTab === 'annotations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annotations
            </button>
          </div>

          {/* Tab Content */}
          <div className="h-96 overflow-y-auto">
            {activeTab === 'discussions' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold">Lesson Discussions</h5>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {discussions.length} posts
                  </span>
                </div>
                
                {loading.discussions ? (
                  <div className="text-center py-8">
                    <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600">Loading discussions...</p>
                  </div>
                ) : (
                  <>
                    {discussions.map(discussion => (
                      <div key={discussion.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {getUserInitials(discussion)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">
                                  {discussion.first_name} {discussion.last_name}
                                </span>
                                {discussion.is_pinned && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                    Pinned
                                  </span>
                                )}
                                {discussion.video_timestamp && (
                                  <button
                                    onClick={() => handleAnnotationClick(discussion.video_timestamp!)}
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(discussion.video_timestamp)}</span>
                                  </button>
                                )}
                              </div>
                              {/* Moderation controls - only show for teachers/admins */}
                              {(discussion.user_id === currentUserId || userRole === 'teacher' || userRole === 'admin') && (
                                <div className="relative">
                                  <button className="text-gray-500 hover:text-gray-700">
                                    <Settings className="h-4 w-4" />
                                  </button>
                                  {/* TODO: Implement dropdown menu for moderation actions */}
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{discussion.content}</p>
                            
                            {/* Replies */}
                            {discussion.replies.map(reply => (
                              <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-gray-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                      {getUserInitials(reply)}
                                    </div>
                                    <span className="font-medium text-sm">
                                      {reply.first_name} {reply.last_name}
                                    </span>
                                  </div>
                                  {/* Reply moderation controls */}
                                  {(reply.user_id === currentUserId || userRole === 'teacher' || userRole === 'admin') && (
                                    <button className="text-gray-500 hover:text-gray-700">
                                      <Settings className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                              </div>
                            ))}
                            
                            {/* Reply Input */}
                            <div className="mt-2 flex space-x-2">
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={newReply[discussion.id] || ''}
                                onChange={(e) => setNewReply(prev => ({ 
                                  ...prev, 
                                  [discussion.id]: e.target.value 
                                }))}
                                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button 
                                onClick={() => createReply(discussion.id, newReply[discussion.id] || '')}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                
                  {/* New Discussion Input */}
                  <div className="border-t pt-4">
                    <textarea
                      placeholder="Start a new discussion..."
                      value={newDiscussion}
                      onChange={(e) => setNewDiscussion(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500 flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        Posts may be reviewed by moderators
                      </div>
                      <button 
                        onClick={createDiscussion}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-150"
                      >
                        Post Discussion
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            {activeTab === 'annotations' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold">Annotations</h5>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Show:</span>
                    <button
                      onClick={() => setShowAnnotations(!showAnnotations)}
                      className={`text-xs px-2 py-1 rounded ${
                        showAnnotations 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {showAnnotations ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
                
                {/* Annotation Type Filter */}
                <div className="flex space-x-2">
                  {['all', 'highlight', 'comment', 'bookmark'].map((type) => (
                    <button
                      key={type}
                      className={`text-xs px-2 py-1 rounded capitalize ${
                        'all' === type 
                          ? 'bg-gray-200 text-gray-800' 
                          : type === 'highlight' 
                            ? 'bg-blue-100 text-blue-700' 
                            : type === 'comment' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {loading.annotations ? (
                  <div className="text-center py-8">
                    <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600">Loading annotations...</p>
                  </div>
                ) : (
                  <>
                    {annotations.length > 0 ? (
                      annotations.map(annotation => (
                        <div 
                          key={annotation.id}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
                            annotation.type === 'highlight' ? 'border-blue-500 bg-blue-50' :
                            annotation.type === 'comment' ? 'border-green-500 bg-green-50' :
                            'border-purple-500 bg-purple-50'
                          }`}
                          onClick={() => handleAnnotationClick(annotation.timestamp)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${
                              annotation.type === 'highlight' ? 'text-blue-700' :
                              annotation.type === 'comment' ? 'text-green-700' :
                              'text-purple-700'
                            }`}>
                              {annotation.type}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(annotation.timestamp)}</span>
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{annotation.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {annotation.is_public ? 'Public' : 'Private'}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement delete functionality
                                console.log('Delete annotation', annotation.id);
                              }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <PenTool className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No annotations yet</p>
                        <p className="text-xs">Add highlights and comments as you watch</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Quiz Taking Interface */}
    {showQuizTaking && selectedQuiz && (
      <QuizTakingInterface
        quizId={selectedQuiz}
        onClose={() => setShowQuizTaking(false)}
        onQuizComplete={handleQuizComplete}
      />
    )}

    {/* Quiz Results */}
    {showQuizResults && quizResults && (
      <QuizResults
        attemptId={quizAttemptId!}
        results={{
          score: quizResults.score,
          max_score: quizResults.max_score,
          percentage: Math.round((quizResults.score / quizResults.max_score) * 100),
          results: JSON.parse(quizResults.answers)
        }}
        onClose={() => setShowQuizResults(false)}
        onRetake={handleRetakeQuiz}
      />
    )}
  </div>
);

export default EnhancedVideoPlayer;
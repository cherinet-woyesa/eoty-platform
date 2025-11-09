
import * as React from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  MessageCircle, PenTool,
  X, AlertCircle, Clock, Send,
  Loader, WifiOff,
  Zap, Share2,
  PictureInPicture, Volume1,
  Monitor, BarChart,
  FastForward, Rewind
} from 'lucide-react';
import { interactiveApi } from '../../services/api';
import { subtitlesApi } from '../../services/api/subtitles';
import type { SubtitleTrack } from '../../services/api/subtitles';
import { lessonResourcesApi } from '../../services/api/lessonResources';
import type { LessonResource } from '../../services/api/lessonResources';
import QuizInterface from './QuizInterface';
import SubtitleSelector from './SubtitleSelector';
import SubtitleDisplay from './SubtitleDisplay';
import QualitySelector, { type QualityLevel } from './QualitySelector';
import ResourceList from './ResourceList';

interface EnhancedVideoPlayerProps {
  videoUrl: string;
  title?: string;
  lessonId: string;
  autoPlay?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  courseTitle?: string;
  chapterTitle?: string;
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
}interface Quiz {
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

interface VideoStats {
  buffered: number;
  droppedFrames: number;
  networkActivity: number;
  currentBitrate: number;
  averageBitrate: number;
}

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoUrl,
  title,
  lessonId,
  autoPlay = false,
  onTimestampClick,
  courseTitle,
  chapterTitle,
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
  const [showAnnotations, setShowAnnotations] = React.useState(true);
  const [showQuiz, setShowQuiz] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'discussions' | 'annotations' | 'resources'>('discussions');

  // Data states
  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
  const [discussions, setDiscussions] = React.useState<Discussion[]>([]);
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [resources, setResources] = React.useState<LessonResource[]>([]);
  const [loading, setLoading] = React.useState({
    annotations: false,
    discussions: false,
    quizzes: false,
    subtitles: false,
    resources: false
  });
  const [newDiscussion, setNewDiscussion] = React.useState('');
  const [newReply, setNewReply] = React.useState<{ [key: string]: string }>({});
  
  // Subtitle states
  const [subtitles, setSubtitles] = React.useState<SubtitleTrack[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = React.useState<string | null>(null);
  const [currentSubtitleCue, setCurrentSubtitleCue] = React.useState<string>('');
  const [subtitleTextTrack, setSubtitleTextTrack] = React.useState<TextTrack | null>(null);
  
  // Quality states
  const [qualityLevels, setQualityLevels] = React.useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = React.useState<number>(-1); // -1 = Auto 
 // Enhanced states
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

  const [showVideoStats, setShowVideoStats] = React.useState(false);
  const [theaterMode, setTheaterMode] = React.useState(false);
  const [, setPictureInPicture] = React.useState(false);
  const [, setIsFullscreen] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  // Quiz states
  const [showQuizTaking, setShowQuizTaking] = React.useState(false);
  const [, setQuizResults] = React.useState<any>(null);

  // Modal states
  const [showAnnotationModal, setShowAnnotationModal] = React.useState(false);
  const [annotationType] = React.useState<'highlight' | 'comment' | 'bookmark'>('comment');
  const [annotationContent, setAnnotationContent] = React.useState('');

  // Enhanced video URL resolution
  const [resolvedVideoUrl, setResolvedVideoUrl] = React.useState(videoUrl);
  const [isHls, setIsHls] = React.useState(false);
  const [urlRefreshKey, setUrlRefreshKey] = React.useState(0); // Key to force URL refresh
  const [webmRetryCount, setWebmRetryCount] = React.useState(0); // Track WebM retry attempts
  const MAX_WEBM_RETRIES = 5; // Maximum retries for WebM format errors
  
  // Function to fetch fresh video URL from backend
  const fetchVideoUrl = React.useCallback(async () => {
    if (!lessonId) return null;
    
    try {
      console.log('Fetching fresh signed URL for lesson:', lessonId);
      
      // Use apiClient instead of fetch for consistency
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/courses/lessons/${lessonId}/video-url`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get video URL: ${response.statusText}`);
      }

      const data = await response.json();
      const freshVideoUrl = data.data?.videoUrl;
      
      console.log('Fresh signed URL received:', freshVideoUrl);
      
      if (!freshVideoUrl) {
        // Video might still be processing
        const status = data.data?.status;
        const metadata = data.data?.metadata || {};
        
        if (status === 'processing' || metadata.isProcessing) {
          setVideoError('Video is still being transcoded. Please wait a few minutes and refresh the page.');
          console.log('Video is still processing, waiting for transcoding to complete...');
          return null;
        } else {
          throw new Error('Video URL not available. The video may not have been uploaded yet.');
        }
      }
      
      // Check if it's actually an HLS stream (not just a URL with query params)
      const isActuallyHls = freshVideoUrl.includes('.m3u8') || freshVideoUrl.includes('/hls/');
      
      setResolvedVideoUrl(freshVideoUrl);
      setIsHls(isActuallyHls);
      
      console.log('Video type detected:', isActuallyHls ? 'HLS' : 'Direct video file');
      
      onLoad?.({ lesson: { video_url: freshVideoUrl } });
      return freshVideoUrl;
    } catch (error) {
      console.error('Failed to initialize video:', error);
      setVideoError(`Failed to load video: ${(error as Error).message}`);
      setIsHls(false);
      return null;
    }
  }, [lessonId, onLoad]);

  // Initialize video URL - Fetch fresh signed URL from backend
  React.useEffect(() => {
    if (lessonId) {
      fetchVideoUrl();
    }
  }, [lessonId, urlRefreshKey, fetchVideoUrl]);

  // HLS.js integration and direct video support
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) return;

    let hls: Hls | null = null;

    const setupHls = () => {
      // Check if it's actually an HLS stream (not just a URL with query params)
      const isActuallyHls = resolvedVideoUrl.includes('.m3u8');
      
      if (isActuallyHls) {
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            maxFragLookUpTolerance: 0.2,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            debug: false,
            enableSoftwareAES: true,
            startLevel: -1,
          });

          hls.loadSource(resolvedVideoUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed successfully');
            setNetworkStatus({ status: 'online', retryCount: 0 });
            
            // Extract quality levels
            const hlsInstance = hls;
            if (hlsInstance && hlsInstance.levels && hlsInstance.levels.length > 0) {
              const levels: QualityLevel[] = hlsInstance.levels.map((level, index) => ({
                index,
                height: level.height,
                bitrate: level.bitrate,
                label: `${level.height}p`,
              }));
              
              // Sort by height descending (highest quality first)
              levels.sort((a, b) => b.height - a.height);
              
              setQualityLevels(levels);
              console.log('Available quality levels:', levels);
            }
          });

          // Listen for quality level switches
          hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
            const hlsInstance = hls;
            if (!hlsInstance) return;
            
            console.log('Quality level switched to:', data.level);
            const previousLevel = currentQuality;
            setCurrentQuality(data.level);
            
            // Update video stats with new bitrate
            if (hlsInstance.levels && hlsInstance.levels[data.level]) {
              setVideoStats(prev => ({
                ...prev,
                currentBitrate: hlsInstance.levels[data.level].bitrate,
              }));
            }

            // Track automatic quality switches (when not manually set)
            if (hlsInstance.currentLevel === -1 && previousLevel !== data.level && hlsInstance.levels) {
              console.log('Automatic quality switch:', {
                from: previousLevel === -1 ? 'auto' : `${hlsInstance.levels[previousLevel]?.height}p`,
                to: `${hlsInstance.levels[data.level]?.height}p`,
                type: 'automatic'
              });
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
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
                  setVideoError('Fatal HLS error: ' + data.details);
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = resolvedVideoUrl;
        } else {
          throw new Error('HLS is not supported in this browser');
        }
      } else {
        video.src = resolvedVideoUrl;
      }
    };

    try {
      setupHls();
    } catch (error) {
      console.error('Video setup error:', error);
      setVideoError((error as Error).message);
      onError?.(error as Error);
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedVideoUrl, isHls, onError]); 
 // Video event handlers
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);
    const handleEnd = () => setIsPlaying(false);
    
    const handleError = (e: Event) => {
      const videoElement = e.target as HTMLVideoElement;
      const error = videoElement.error;
      let errorMessage = 'Unknown video error';
      
      // Check if the video URL is WebM format
      const isWebM = resolvedVideoUrl?.toLowerCase().includes('.webm') || 
                     resolvedVideoUrl?.toLowerCase().includes('video/webm');
      
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
            if (isWebM && webmRetryCount < MAX_WEBM_RETRIES) {
              errorMessage = 'WebM format not supported by this browser. Checking for transcoded version...';
              // Try to refresh the video URL - transcoding may have completed
              console.log(`WebM format error detected (attempt ${webmRetryCount + 1}/${MAX_WEBM_RETRIES}), refreshing video URL to check for transcoded version...`);
              setWebmRetryCount(prev => prev + 1);
              setTimeout(() => {
                setUrlRefreshKey(prev => prev + 1); // Trigger URL refresh
              }, 3000 * (webmRetryCount + 1)); // Exponential backoff: 3s, 6s, 9s, 12s, 15s
            } else if (isWebM) {
              errorMessage = 'WebM format not supported and transcoding may still be in progress. Please wait a few minutes and refresh the page.';
            } else {
              errorMessage = 'Video format not supported by this browser';
            }
            break;
        }
      }
      
      console.error('Video playback error:', {
        errorCode: error?.code,
        errorMessage,
        videoUrl: resolvedVideoUrl,
        isWebM,
        videoElement: {
          networkState: videoElement.networkState,
          readyState: videoElement.readyState,
          error: videoElement.error
        }
      });
      
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
  }, [onError]);  // Load data from backend
  React.useEffect(() => {
    loadAnnotations();
    loadDiscussions();
    loadQuizzes();
    loadSubtitles();
    loadResources();
  }, [lessonId]);

  // API functions
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

  const loadSubtitles = async () => {
    setLoading(prev => ({ ...prev, subtitles: true }));
    try {
      const response = await subtitlesApi.getSubtitles(lessonId);
      if (response.success) {
        setSubtitles(response.data.subtitles || []);
      }
    } catch (error) {
      console.error('Failed to load subtitles:', error);
    } finally {
      setLoading(prev => ({ ...prev, subtitles: false }));
    }
  };

  const loadResources = async () => {
    setLoading(prev => ({ ...prev, resources: true }));
    try {
      const response = await lessonResourcesApi.getResources(lessonId);
      if (response.success) {
        setResources(response.data.resources || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(prev => ({ ...prev, resources: false }));
    }
  };

  // Subtitle track management
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove existing text tracks
    const existingTracks = Array.from(video.textTracks);
    existingTracks.forEach(track => {
      track.mode = 'hidden';
    });

    if (!currentSubtitleTrack) {
      setCurrentSubtitleCue('');
      setSubtitleTextTrack(null);
      return;
    }

    // Find the selected subtitle
    const selectedSubtitle = subtitles.find(s => s.id === currentSubtitleTrack);
    if (!selectedSubtitle) return;

    // Add new text track
    const track = video.addTextTrack('subtitles', selectedSubtitle.language, selectedSubtitle.language_code);
    track.mode = 'hidden'; // We'll handle display ourselves

    // Load VTT file
    fetch(selectedSubtitle.file_url)
      .then(response => response.text())
      .then(vttContent => {
        // Parse VTT and add cues
        const cues = parseVTT(vttContent);
        cues.forEach(cue => {
          try {
            const vttCue = new VTTCue(cue.startTime, cue.endTime, cue.text);
            track.addCue(vttCue);
          } catch (error) {
            console.error('Failed to add cue:', error);
          }
        });
        setSubtitleTextTrack(track);
      })
      .catch(error => {
        console.error('Failed to load subtitle file:', error);
      });

    return () => {
      // Cleanup
      if (track && track.cues) {
        Array.from(track.cues).forEach(cue => {
          track.removeCue(cue);
        });
      }
    };
  }, [currentSubtitleTrack, subtitles]);

  // Update current subtitle cue based on video time
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !subtitleTextTrack) return;

    const updateCue = () => {
      if (!subtitleTextTrack.cues) return;

      const currentTime = video.currentTime;
      let activeCue = '';

      for (let i = 0; i < subtitleTextTrack.cues.length; i++) {
        const cue = subtitleTextTrack.cues[i] as VTTCue;
        if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
          activeCue = cue.text;
          break;
        }
      }

      setCurrentSubtitleCue(activeCue);
    };

    video.addEventListener('timeupdate', updateCue);
    return () => {
      video.removeEventListener('timeupdate', updateCue);
    };
  }, [subtitleTextTrack]);

  // Parse VTT content
  const parseVTT = (vttContent: string) => {
    const lines = vttContent.split('\n');
    const cues: Array<{ startTime: number; endTime: number; text: string }> = [];
    let i = 0;

    // Skip WEBVTT header
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();

      // Look for timestamp line
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        const startTime = parseVTTTimestamp(startStr);
        const endTime = parseVTTTimestamp(endStr);

        // Collect text lines
        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }

        if (textLines.length > 0) {
          cues.push({
            startTime,
            endTime,
            text: textLines.join('\n'),
          });
        }
      }
      i++;
    }

    return cues;
  };

  // Parse VTT timestamp to seconds
  const parseVTTTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (
        parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseFloat(seconds)
      );
    } else if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
  };

  const handleSubtitleTrackChange = (trackId: string | null) => {
    setCurrentSubtitleTrack(trackId);
  };

  // Resource download handler
  const handleResourceDownload = async (resource: LessonResource) => {
    try {
      const response = await lessonResourcesApi.downloadResource(lessonId, resource.id);
      if (response.success && response.data.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = resource.original_filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reload resources to update download count
        loadResources();
      }
    } catch (error) {
      console.error('Failed to download resource:', error);
      alert('Failed to download resource. Please try again.');
    }
  };

  // Quality switching handler
  const handleQualityChange = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls || !hls.levels) return;

    console.log('Changing quality to level:', levelIndex);
    
    // -1 means Auto mode
    if (levelIndex === -1) {
      hls.currentLevel = -1; // Enable adaptive bitrate
      setCurrentQuality(-1);
      onQualityChange?.('auto');
    } else {
      hls.currentLevel = levelIndex; // Set specific quality level
      setCurrentQuality(levelIndex);
      const qualityLabel = hls.levels[levelIndex]?.height ? `${hls.levels[levelIndex].height}p` : 'unknown';
      onQualityChange?.(qualityLabel);
    }
  };

  // Video control functions
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
  };  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRetry = async () => {
    setNetworkStatus(prev => ({ ...prev, status: 'reconnecting' }));
    
    try {
      const video = videoRef.current;
      if (video) {
        console.log('Retrying video load with URL:', resolvedVideoUrl);
        video.load();
        await video.play();
        setVideoError(null);
        setNetworkStatus({ status: 'online', retryCount: 0 });
      }
    } catch (error) {
      console.error('Retry failed:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('no supported source')) {
        setVideoError('Video format not supported or URL expired. Please refresh the page.');
      } else if (errorMessage.includes('CORS')) {
        setVideoError('Video access blocked. Please check CORS settings.');
      } else {
        setVideoError(errorMessage);
      }
      
      setNetworkStatus(prev => ({ ...prev, status: 'offline' }));
    }
  };  
// Annotation and discussion functions
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

  // Quiz functions
  const handleStartQuiz = () => {
    setShowQuizTaking(true);
    setShowQuiz(false);
  };

  const handleQuizComplete = (results: any) => {
    setShowQuizTaking(false);
    setQuizResults(results);
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
        >
          Your browser does not support the video tag.
        </video>

        {/* Video Statistics */}
        {showVideoStats && (
          <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 z-30">
            <div className="font-semibold mb-2">Video Stats</div>
            <div>Buffered: {videoStats.buffered.toFixed(1)}s</div>
            <div>Current Bitrate: {(videoStats.currentBitrate / 1000000).toFixed(1)} Mbps</div>
            <div>Avg Bitrate: {(videoStats.averageBitrate / 1000000).toFixed(1)} Mbps</div>
            <div>Dropped Frames: {videoStats.droppedFrames}</div>
            <div>Network Activity: {videoStats.networkActivity}%</div>
          </div>
        )}

        {/* Subtitle Display */}
        <SubtitleDisplay
          currentCue={currentSubtitleCue}
          visible={!!currentSubtitleTrack}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <button onClick={togglePlay} className="p-4 rounded-full bg-white bg-opacity-30 hover:bg-opacity-50 transition-all duration-200">
              <Play className="h-10 w-10 text-white" />
            </button>
          </div>
        )}

        {/* Top Controls */}
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
            <button
              onClick={() => setShowVideoStats(!showVideoStats)}
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Show Statistics"
            >
              <BarChart className="h-5 w-5" />
            </button>

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
                  <button 
                    onClick={() => navigator.clipboard.writeText(window.location.href)} 
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div> 
       {/* Bottom Controls */}
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
              
              <button onClick={() => seekRelative(-10)} className="text-white hover:text-gray-300" title="Rewind 10s">
                <Rewind className="h-4 w-4" />
              </button>
              <button onClick={() => seekRelative(10)} className="text-white hover:text-gray-300" title="Forward 10s">
                <FastForward className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button onClick={() => setTheaterMode(!theaterMode)} className="text-white hover:text-gray-300" title="Theater Mode">
                <Monitor className="h-5 w-5" />
              </button>
              
              <button onClick={handlePlaybackRate} className="text-white text-sm px-2 py-1 rounded hover:bg-white/20 transition-colors" title="Playback Speed">
                {playbackRate}x
              </button>
              
              {isHls && qualityLevels.length > 0 && (
                <QualitySelector
                  levels={qualityLevels}
                  currentLevel={currentQuality}
                  onLevelChange={handleQualityChange}
                />
              )}
              
              <SubtitleSelector
                tracks={subtitles}
                currentTrack={currentSubtitleTrack}
                onTrackChange={handleSubtitleTrackChange}
              />
              
              <button onClick={togglePictureInPicture} className="text-white hover:text-gray-300" title="Picture in Picture">
                <PictureInPicture className="h-5 w-5" />
              </button>
              
              <button onClick={toggleFullscreen} className="text-white hover:text-gray-300" title="Fullscreen">
                <Maximize className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>       
 {/* Network Status / Error Overlay */}
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
            Resources ({resources.length})
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
                  <div key={discussion.id} className="bg-gray-750 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
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
                    </div>

                    <p className="text-gray-200 text-sm leading-relaxed mb-3">
                      {discussion.content}
                    </p>

                    {/* Replies */}
                    {discussion.replies && discussion.replies.length > 0 && (
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
            <div className="p-4 space-y-4">
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

              {loading.annotations ? (
                <div className="text-center py-8">
                  <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
                  <p className="text-gray-400">Loading annotations...</p>
                </div>
              ) : annotations.length > 0 ? (
                <div className="space-y-3">
                  {annotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className="p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-700 transition-all duration-200 group border-blue-400"
                      onClick={() => handleAnnotationClick(annotation.timestamp)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded bg-blue-400 bg-opacity-20">
                            <PenTool className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-blue-400">
                            {annotation.type}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(annotation.timestamp)}</span>
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">{annotation.content}</p>
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

              <button
                onClick={() => setShowAnnotationModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Annotation
              </button>
            </div>
          )}        
  {activeTab === 'resources' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-white text-lg">Lesson Resources</h5>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                  {resources.length} {resources.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <ResourceList
                resources={resources}
                loading={loading.resources}
                onDownload={handleResourceDownload}
              />
            </div>
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
          lessonId={parseInt(lessonId)}
          onQuizComplete={handleQuizComplete}
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
    </div>
  );
};

export default EnhancedVideoPlayer;
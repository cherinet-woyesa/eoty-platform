import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Users, Image, Video, Mic, FileText, Calendar,
  MapPin, Clock, Heart, MessageCircle, Share2,
  Send, X, Loader2, MoreVertical, Bookmark,
  Edit3, Trash2, Plus, TrendingUp, Sparkles,
  Search, Filter, BarChart3, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import CommentSection from '@/components/shared/social/CommentSection';
import ShareModal from '@/components/shared/social/ShareModal';

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  media_type?: 'image' | 'video' | 'audio' | 'article';
  media_url?: string;
  created_at: string;
  likes: number;
  comments: number;
  shares: number;
  liked_by_user: boolean;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  type: 'online' | 'in-person' | 'hybrid';
}

const CommunityHub: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'my-posts' | 'search' | 'trending'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio' | 'article' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'article'>('all');
  const [searchSort, setSearchSort] = useState<'newest' | 'oldest' | 'most_liked' | 'most_commented'>('newest');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [showTrending, setShowTrending] = useState(false);
  const [feedStats, setFeedStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock upcoming events
  const upcomingEvents: Event[] = useMemo(() => [
    {
      id: '1',
      title: 'Community Prayer Session',
      date: '2025-11-20',
      time: '6:00 PM',
      location: 'Main Chapel',
      attendees: 45,
      type: 'in-person'
    },
    {
      id: '2',
      title: 'Youth Bible Study',
      date: '2025-11-22',
      time: '7:30 PM',
      location: 'Online',
      attendees: 82,
      type: 'online'
    },
    {
      id: '3',
      title: 'Community Service Day',
      date: '2025-11-25',
      time: '9:00 AM',
      location: 'Community Center',
      attendees: 156,
      type: 'hybrid'
    }
  ], []);

  // Load posts on component mount
  React.useEffect(() => {
    loadPosts();
    loadFeedStats();
  }, [user?.id]);


  const loadPosts = useCallback(() => {
    // Fetch from backend
    let isMounted = true;
    const fetch = async () => {
      setLoadingPosts(true);
      console.log('🔄 Loading posts from API...');
      try {
        console.log('🌐 Making API call to fetch posts...');
        console.log('👤 Current user:', user);
        console.log('🔑 Token exists:', !!localStorage.getItem('token'));

        const resp = await communityPostsApi.fetchPosts();
        console.log('✅ Raw API Response:', resp);
        console.log('📊 Response status:', resp?.status);
        console.log('📦 Response data:', resp?.data);

        if (!isMounted) {
          console.log('🚫 Component unmounted, aborting');
          return;
        }

        const serverPosts = resp?.data?.posts || [];
        console.log('📝 Server posts count:', serverPosts.length);
        console.log('📝 Server posts:', serverPosts);

        setPosts(serverPosts);
        // derive myPosts from server posts
        const myFilteredPosts = serverPosts.filter((p: Post) => p.author_id === user?.id);
        setMyPosts(myFilteredPosts);

        console.log('✅ Posts loaded successfully');
        console.log('👤 My posts count:', myFilteredPosts.length);
      } catch (err: any) {
        console.warn('Failed to load posts from server, falling back to localStorage', err);
        // fallback to localStorage if server unreachable
        const savedPosts = localStorage.getItem(`community_posts_${user?.id}`);
        const savedMyPosts = localStorage.getItem(`my_posts_${user?.id}`);
        if (savedPosts) {
          try { setPosts(JSON.parse(savedPosts)); } catch (e) { console.warn('Failed to parse posts'); }
        }
        if (savedMyPosts) {
          try { setMyPosts(JSON.parse(savedMyPosts)); } catch (e) { console.warn('Failed to parse my posts'); }
        }
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    };

    fetch();
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleMediaSelect = (type: 'image' | 'video' | 'audio' | 'article') => {
    setSelectedMediaType(type);
    if (type !== 'article' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Only set preview if we still have the same file
          if (mediaFile === file) {
            setMediaPreview(reader.result as string);
          }
        };
        reader.onerror = () => {
          console.error('Failed to read file');
          setMediaFile(null);
          setMediaPreview(null);
          setSelectedMediaType(null);
        };
        reader.readAsDataURL(file);
      }
      // For videos, just show a placeholder or filename
      else if (file.type.startsWith('video/')) {
        // Don't create data URL for videos as they can be very large
        // Just show that a video is selected
        setMediaPreview(`video:${file.name}`);
      }

      // Clear the input value to allow re-selecting the same file
      e.target.value = '';
    }
  };

  const handleCreatePost = useCallback(() => {
    if (!newPostContent.trim() && !mediaFile) return;

    const create = async () => {
      setSubmissionError(null);
      try {
        let mediaUrl: string | undefined = undefined;

        if (mediaFile) {
          setUploadProgress(0);
          const uploadResp = await communityPostsApi.uploadMedia(mediaFile, (p) => setUploadProgress(Math.round(p)));
          mediaUrl = uploadResp?.data?.url || uploadResp?.url;
          setUploadProgress(null);
        }

        const resp = await communityPostsApi.createPost({
          content: newPostContent,
          mediaType: selectedMediaType || undefined,
          mediaUrl
        });

        const created = resp?.data?.post;
        if (created) {
          setPosts(prev => [created, ...prev]);
          if (created.author_id === user?.id) setMyPosts(prev => [created, ...prev]);
        }

        // Reset form
        setNewPostContent('');
        setSelectedMediaType(null);
        setMediaFile(null);
        setMediaPreview(null);
        setShowCreatePost(false);
      } catch (err: any) {
        console.error('Failed to create post', err);
        setSubmissionError(err?.response?.data?.message || err.message || 'Failed to create post');
        setUploadProgress(null);
      }
    };

    create();
  }, [newPostContent, mediaFile, mediaPreview, selectedMediaType, posts, myPosts, user]);

  const handleLikePost = useCallback((postId: string) => {
    const updatePostsArray = (postsArray: Post[]) =>
      postsArray.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: post.liked_by_user ? post.likes - 1 : post.likes + 1,
            liked_by_user: !post.liked_by_user
          };
        }
        return post;
      });

    setPosts(updatePostsArray(posts));
    setMyPosts(updatePostsArray(myPosts));
  }, [posts, myPosts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await communityPostsApi.deletePost(postId);

      // Update local state
      setPosts(prev => prev.filter(p => p.id !== postId));
      setMyPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      // Could show an error toast here
    }
  }, []);

  const handleEditPost = useCallback(async (postId: string) => {
    if (!editContent.trim()) return;

    try {
      await communityPostsApi.updatePost(postId, { content: editContent });

      // Update local state
      const updatePost = (posts: Post[]) =>
        posts.map(p => p.id === postId ? { ...p, content: editContent } : p);

      setPosts(updatePost);
      setMyPosts(updatePost);
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit post:', error);
      // Could show an error toast here
    }
  }, [editContent]);

  const handleCommentCountChange = useCallback((postId: string, newCount: number) => {
    const updatePost = (posts: Post[]) =>
      posts.map(p => p.id === postId ? { ...p, comments: newCount } : p);

    setPosts(updatePost);
    setMyPosts(updatePost);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await communityPostsApi.searchPosts({
        q: searchQuery,
        filter: searchFilter,
        sort: searchSort
      });

      if (response.success) {
        setSearchResults(response.data.posts);
        setActiveTab('search');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchFilter, searchSort]);

  const handleTrending = useCallback(async () => {
    try {
      const response = await communityPostsApi.getTrendingPosts({
        period: '24h',
        limit: 20
      });

      if (response.success) {
        setTrendingPosts(response.data.posts);
        setShowTrending(true);
        setActiveTab('trending');
      }
    } catch (error) {
      console.error('Trending failed:', error);
    }
  }, []);

  const loadFeedStats = useCallback(async () => {
    try {
      const response = await communityPostsApi.getFeedStats();
      if (response.success) {
        setFeedStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load feed stats:', error);
    }
  }, []);

  const handleShareSuccess = useCallback(() => {
    // Update share count for the shared post
    if (sharingPost) {
      const updatePost = (posts: Post[]) =>
        posts.map(p => p.id === sharingPost.id ? { ...p, shares: p.shares + 1 } : p);

      setPosts(updatePost);
      setMyPosts(updatePost);
    }
    setSharingPost(null);
  }, [sharingPost]);

  const startEditing = useCallback((post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setShowPostMenu(null);
  }, []);

  const PostCard: React.FC<{
    post: Post;
    showActions?: boolean;
    onDelete?: (postId: string) => void;
    editingPost?: string | null;
    editContent?: string;
    onEditContentChange?: (content: string) => void;
    onSaveEdit?: (postId: string) => void;
    onCancelEdit?: () => void;
    onCommentCountChange?: (postId: string, newCount: number) => void;
  }> = ({
    post,
    showActions = true,
    onDelete,
    editingPost,
    editContent = '',
    onEditContentChange,
    onSaveEdit,
    onCancelEdit,
    onCommentCountChange
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center text-white font-bold flex-shrink-0">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt={post.author_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              post.author_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{post.author_name}</h3>
            <p className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {showActions && post.author_id === user?.id && (
          <div className="relative">
            <button
              onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
            {showPostMenu === post.id && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  onClick={() => startEditing(post)}
                  className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Post
                </button>
                <button
                  onClick={() => {
                    onDelete?.(post.id);
                    setShowPostMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {editingPost === post.id ? (
        <div className="mb-4">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange?.(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Edit your post..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSaveEdit?.(post.id)}
              disabled={!editContent.trim()}
              className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 relative">
          {/* Loading placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
            <div className="text-gray-500 text-sm">Loading image...</div>
          </div>
          <img
            key={post.id}
            src={post.media_url}
            alt="Post media"
            className="w-full max-h-96 object-cover transition-opacity duration-300 relative z-10"
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.opacity = '1';
              // Hide loading placeholder
              const placeholder = img.parentElement?.querySelector('.animate-pulse');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'none';
              }
            }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              // Hide loading placeholder and show error
              const placeholder = img.parentElement?.querySelector('.animate-pulse');
              if (placeholder) {
                placeholder.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-500"><span>Image failed to load</span></div>';
                (placeholder as HTMLElement).classList.remove('animate-pulse');
              }
            }}
            style={{ opacity: 0 }}
            loading="lazy"
          />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 relative">
          {/* Loading placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse z-10">
            <div className="text-gray-500 text-sm">Loading video...</div>
          </div>
          <video
            key={post.id}
            src={post.media_url}
            controls
            className="w-full max-h-96 transition-opacity duration-300 relative z-20"
            preload="metadata"
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              video.style.opacity = '1';
              // Hide loading placeholder
              const placeholder = video.parentElement?.querySelector('.animate-pulse');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'none';
              }
            }}
            onError={(e) => {
              const video = e.target as HTMLVideoElement;
              video.style.display = 'none';
              // Hide loading placeholder and show error
              const placeholder = video.parentElement?.querySelector('.animate-pulse');
              if (placeholder) {
                placeholder.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-500"><span>Video failed to load</span></div>';
                (placeholder as HTMLElement).classList.remove('animate-pulse');
              }
            }}
            style={{ opacity: 0 }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
      {post.media_url && post.media_type === 'audio' && (
        <div className="mb-4">
          <audio
            src={post.media_url}
            controls
            className="w-full"
            onError={(e) => {
              (e.target as HTMLAudioElement).style.display = 'none';
              const parent = (e.target as HTMLAudioElement).parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex items-center justify-center h-16 bg-gray-200 text-gray-500 rounded"><span>Audio failed to load</span></div>';
              }
            }}
          />
        </div>
      )}
      {post.media_type === 'article' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <FileText className="h-6 w-6 text-blue-600 mb-2" />
          <p className="text-sm text-blue-900">Article content would appear here</p>
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => handleLikePost(post.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            post.liked_by_user 
              ? 'text-red-600 bg-red-50 hover:bg-red-100' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart className={`h-5 w-5 ${post.liked_by_user ? 'fill-current' : ''}`} />
          <span className="font-medium">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{post.comments}</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Share2 className="h-5 w-5" />
          <span className="font-medium">{post.shares}</span>
        </button>
        <button
          onClick={() => {
            setSharingPost(post);
            setShowShareModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Share2 className="h-5 w-5" />
          <span className="font-medium">{post.shares}</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bookmark className="h-5 w-5" />
        </button>
      </div>

      {/* Comments Section */}
      <CommentSection
        postId={post.id}
        commentCount={post.comments}
        onCommentCountChange={(newCount) => onCommentCountChange?.(post.id, newCount)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Hub</h1>
                <p className="text-gray-600">Share your journey, connect with others, and stay inspired</p>
              </div>

              {/* Feed Stats */}
              {feedStats && (
                <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{feedStats.global.totalPosts}</div>
                    <div>Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{feedStats.global.totalLikes}</div>
                    <div>Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{feedStats.global.todayPosts}</div>
                    <div>Today</div>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search posts, people..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                />
              </div>

              {/* Search Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-sm"
                >
                  <option value="all">All Posts</option>
                  <option value="text">Text Only</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="article">Articles</option>
                </select>

                <select
                  value={searchSort}
                  onChange={(e) => setSearchSort(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most_liked">Most Liked</option>
                  <option value="most_commented">Most Commented</option>
                </select>

                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#27AE60]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>

                <button
                  onClick={handleTrending}
                  className="px-4 py-2 bg-gradient-to-r from-[#2980B9] to-[#16A085] text-white rounded-lg hover:from-[#2980B9]/90 hover:to-[#16A085]/90 flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Create Post Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center text-white font-bold">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="You" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      user?.firstName?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex-1 px-4 py-3 text-left text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    What's on your mind, {user?.firstName}?
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleMediaSelect('image')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Image className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Photo</span>
                  </button>
                  <button
                    onClick={() => handleMediaSelect('video')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Video className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Video</span>
                  </button>
                  <button
                    onClick={() => handleMediaSelect('audio')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Mic className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Audio</span>
                  </button>
                  <button
                    onClick={() => handleMediaSelect('article')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Article</span>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    <button
                      onClick={() => setActiveTab('feed')}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                        activeTab === 'feed'
                          ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <TrendingUp className="h-5 w-5" />
                      My Feed
                    </button>
                    <button
                      onClick={() => setActiveTab('my-posts')}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                        activeTab === 'my-posts'
                          ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Edit3 className="h-5 w-5" />
                      My Posts ({myPosts.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('search')}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                        activeTab === 'search'
                          ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Search className="h-5 w-5" />
                      Search ({searchResults.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('trending')}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                        activeTab === 'trending'
                          ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="h-5 w-5" />
                      Trending ({trendingPosts.length})
                    </button>
                  </nav>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {activeTab === 'feed' ? (
                  posts.length > 0 ? (
                    posts.map(post => <PostCard
                      key={post.id}
                      post={post}
                      onDelete={handleDeletePost}
                      editingPost={editingPost}
                      editContent={editContent}
                      onEditContentChange={setEditContent}
                      onSaveEdit={handleEditPost}
                      onCancelEdit={() => {
                        setEditingPost(null);
                        setEditContent('');
                      }}
                      onCommentCountChange={handleCommentCountChange}
                    />)
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                      <p className="text-gray-600 mb-4">Be the first to share something with the community!</p>
                      <button
                        onClick={() => setShowCreatePost(true)}
                        className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Create Your First Post
                      </button>
                    </div>
                  )
                ) : activeTab === 'my-posts' ? (
                  myPosts.length > 0 ? (
                    myPosts.map(post => (
                      <div key={post.id} className="relative">
                        <PostCard
                          post={post}
                          showActions={true}
                          onDelete={handleDeletePost}
                          editingPost={editingPost}
                          editContent={editContent}
                          onEditContentChange={setEditContent}
                          onSaveEdit={handleEditPost}
                          onCancelEdit={() => {
                            setEditingPost(null);
                            setEditContent('');
                          }}
                          onCommentCountChange={handleCommentCountChange}
                        />
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="absolute top-4 right-4 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">You haven't posted anything yet</h3>
                      <p className="text-gray-600 mb-4">Share your thoughts, experiences, or insights with the community</p>
                      <button
                        onClick={() => setShowCreatePost(true)}
                        className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Create Post
                      </button>
                    </div>
                  )
                ) : activeTab === 'search' ? (
                  searchResults.length > 0 ? (
                    searchResults.map(post => <PostCard
                      key={post.id}
                      post={post}
                      onCommentCountChange={handleCommentCountChange}
                    />)
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No search results</h3>
                      <p className="text-gray-600 mb-4">Try adjusting your search terms or filters</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveTab('feed');
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Back to Feed
                      </button>
                    </div>
                  )
                ) : activeTab === 'trending' ? (
                  trendingPosts.length > 0 ? (
                    trendingPosts.map(post => <PostCard
                      key={post.id}
                      post={post}
                      onCommentCountChange={handleCommentCountChange}
                    />)
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No trending posts</h3>
                      <p className="text-gray-600 mb-4">Trending posts will appear here based on community engagement</p>
                      <button
                        onClick={() => setActiveTab('feed')}
                        className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Back to Feed
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {/* Sidebar - Upcoming Events */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-[#27AE60]" />
                    Upcoming Events
                  </h2>
                </div>

                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{event.title}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          event.type === 'online' 
                            ? 'bg-blue-100 text-blue-700'
                            : event.type === 'in-person'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {event.type}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#27AE60]" />
                          <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#27AE60]" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#27AE60]" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#27AE60]" />
                          <span>{event.attendees} attending</span>
                        </div>
                      </div>
                      
                      <button className="w-full mt-3 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
                        Join Event
                      </button>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:border-[#27AE60] hover:text-[#27AE60] rounded-lg transition-all font-medium flex items-center justify-center gap-2">
                  <Plus className="h-5 w-5" />
                  View All Events
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setNewPostContent('');
                  setSelectedMediaType(null);
                  setMediaFile(null);
                  setMediaPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center text-white font-bold">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="You" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    user?.firstName?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-sm text-gray-500">Posting to Community</p>
                </div>
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What would you like to share?"
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 resize-none"
              />

              {/* Media Preview */}
              {mediaPreview && selectedMediaType === 'image' && (
                <div className="mt-4 relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full max-h-64 object-cover"
                    onError={() => {
                      setMediaPreview(null);
                      setMediaFile(null);
                      setSelectedMediaType(null);
                      alert('Failed to load image preview');
                    }}
                  />
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                      setSelectedMediaType(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {mediaPreview && selectedMediaType === 'video' && (
                <div className="mt-4 relative">
                  {mediaPreview.startsWith('video:') ? (
                    <div className="w-full p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <Video className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Video selected: {mediaPreview.replace('video:', '')}</p>
                      <p className="text-xs text-gray-500 mt-1">Video preview will be available after posting</p>
                      <button
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                          setSelectedMediaType(null);
                        }}
                        className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors"
                      >
                        Remove Video
                      </button>
                    </div>
                  ) : (
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                      <video src={mediaPreview} controls className="w-full max-h-64" />
                      <button
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                          setSelectedMediaType(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Media Type Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mr-2">Add to post:</p>
                <button
                  onClick={() => handleMediaSelect('image')}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedMediaType === 'image' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Add Photo"
                >
                  <Image className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleMediaSelect('video')}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedMediaType === 'video' 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Add Video"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleMediaSelect('audio')}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedMediaType === 'audio' 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Add Audio"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedMediaType('article');
                    setShowCreatePost(true);
                  }}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedMediaType === 'article' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Write Article"
                >
                  <FileText className="h-5 w-5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={
                  selectedMediaType === 'image' 
                    ? 'image/*' 
                    : selectedMediaType === 'video' 
                    ? 'video/*' 
                    : selectedMediaType === 'audio'
                    ? 'audio/*'
                    : ''
                }
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              {submissionError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {submissionError}
                </div>
              )}

              {uploadProgress !== null && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Uploading media</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() && !mediaFile}
                className="w-full py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                Post to Community
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSharingPost(null);
        }}
        postId={sharingPost?.id || ''}
        postContent={sharingPost?.content || ''}
        onShareSuccess={handleShareSuccess}
      />
    </div>
  );
};

export default React.memo(CommunityHub);

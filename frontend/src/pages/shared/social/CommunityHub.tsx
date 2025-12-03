import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Image, Video, Mic, FileText, Calendar,
  MapPin, Clock, Heart, MessageCircle, Share2,
  Send, X, Loader2, MoreVertical, Bookmark,
  Edit3, Trash2, Plus, TrendingUp, Sparkles,
  Search, Filter, BarChart3, RefreshCw, Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import CommentSection from '@/components/shared/social/CommentSection';
import ShareModal from '@/components/shared/social/ShareModal';
import PostCard, { Post } from '@/components/shared/social/PostCard';
import CommunitySidebar from '@/components/shared/social/CommunitySidebar';

const CommunityHub: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'my-posts' | 'search' | 'trending'>('feed');
  const [activeFilter, setActiveFilter] = useState('all');
  const [posts, setPosts] = useState<Post[]>([]);
  // myPosts is derived from posts
  const myPosts = useMemo(() => posts.filter(p => p.author_id === user?.id), [posts, user?.id]);
  
  // Filter posts based on active topic/filter
  const filteredPosts = useMemo(() => {
    let currentPosts = activeTab === 'my-posts' ? myPosts : posts;
    
    if (activeFilter === 'all') return currentPosts;
    if (activeFilter === 'discussion') return currentPosts.filter(p => !p.media_type);
    if (activeFilter === 'showcase') return currentPosts.filter(p => p.media_type === 'image' || p.media_type === 'video');
    if (activeFilter === 'article') return currentPosts.filter(p => p.media_type === 'article');
    if (activeFilter === 'qa') return currentPosts.filter(p => p.content.includes('?'));
    
    return currentPosts;
  }, [posts, myPosts, activeTab, activeFilter]);

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
      try {
        const resp = await communityPostsApi.fetchPosts();
        
        if (!isMounted) return;

        const serverPosts = resp?.data?.posts || [];
        setPosts(serverPosts);
      } catch (err: any) {
        console.warn('Failed to load posts from server, falling back to localStorage', err);
        // fallback to localStorage if server unreachable
        const savedPosts = localStorage.getItem(`community_posts_${user?.id}`);
        if (savedPosts) {
          try { setPosts(JSON.parse(savedPosts)); } catch (e) { console.warn('Failed to parse posts'); }
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
  }, [newPostContent, mediaFile, mediaPreview, selectedMediaType, posts, user]);

  const handleLikePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update
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
      
      // Call API
      await communityPostsApi.toggleLike(postId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert on error (could be improved)
      loadPosts();
    }
  }, [posts, loadPosts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await communityPostsApi.deletePost(postId);

      // Update local state
      setPosts(prev => prev.filter(p => p.id !== postId));
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
    }
    setSharingPost(null);
  }, [sharingPost]);

  const startEditing = useCallback((post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setShowPostMenu(null);
  }, []);



  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('community_hub.title')}</h1>
                <p className="text-gray-600">{t('community_hub.subtitle')}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="hidden lg:block lg:col-span-3">
              <CommunitySidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 xl:col-span-6 space-y-6">
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



              {/* Posts Feed */}
              <div className="space-y-4">
                {activeTab === 'search' ? (
                  searchResults.length > 0 ? (
                    searchResults.map(post => <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user?.id}
                      onLike={handleLikePost}
                      onShare={(p) => { setSharingPost(p); setShowShareModal(true); }}
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
                      currentUserId={user?.id}
                      onLike={handleLikePost}
                      onShare={(p) => { setSharingPost(p); setShowShareModal(true); }}
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
                ) : (
                  filteredPosts.length > 0 ? (
                    filteredPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.id}
                        showActions={true}
                        onDelete={handleDeletePost}
                        onLike={handleLikePost}
                        onShare={(p) => { setSharingPost(p); setShowShareModal(true); }}
                        editingPost={editingPost}
                        editContent={editContent}
                        onEditContentChange={setEditContent}
                        onSaveEdit={handleEditPost}
                        onCancelEdit={() => {
                          setEditingPost(null);
                          setEditContent('');
                        }}
                        onCommentCountChange={handleCommentCountChange}
                        onStartEditing={startEditing}
                      />
                    ))
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
                      <p className="text-gray-600 mb-4">
                        {activeFilter !== 'all' 
                          ? `No posts found in ${activeFilter}. Try another topic!` 
                          : "Be the first to share something with the community!"}
                      </p>
                      <button
                        onClick={() => setShowCreatePost(true)}
                        className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        Create Post
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Sidebar - My Chapters & Guidelines */}
            <div className="hidden xl:block xl:col-span-3 space-y-6">
              {/* My Chapters Widget */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#27AE60]" />
                    My Chapters
                  </h2>
                  <a href="/student/chapters" className="text-sm text-[#27AE60] hover:underline font-medium">
                    View All
                  </a>
                </div>
                
                <div className="space-y-3">
                  {/* This would ideally come from an API */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#27AE60]/30 transition-colors cursor-pointer group">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#27AE60] transition-colors">Addis Ababa St. George</h3>
                    <p className="text-xs text-gray-500 mt-1">156 Members • 2 Upcoming Events</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#27AE60]/30 transition-colors cursor-pointer group">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#27AE60] transition-colors">Global Youth Fellowship</h3>
                    <p className="text-xs text-gray-500 mt-1">1.2k Members • Online</p>
                  </div>
                </div>

                <a 
                  href="/student/chapters"
                  className="w-full mt-4 py-2 border border-[#27AE60] text-[#27AE60] hover:bg-[#27AE60] hover:text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <Search className="h-4 w-4" />
                  Find More Chapters
                </a>
              </div>

              {/* Community Guidelines */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#27AE60]" />
                    Guidelines
                  </h2>
                </div>
                
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="text-[#27AE60] font-bold">•</span>
                    <span>Be respectful and kind to fellow members.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#27AE60] font-bold">•</span>
                    <span>Share relevant and edifying content.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#27AE60] font-bold">•</span>
                    <span>Respect privacy and confidentiality.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#27AE60] font-bold">•</span>
                    <span>No spam or self-promotion.</span>
                  </li>
                </ul>
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

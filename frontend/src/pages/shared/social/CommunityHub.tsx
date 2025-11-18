import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Users, Image, Video, Mic, FileText, Calendar, 
  MapPin, Clock, Heart, MessageCircle, Share2,
  Send, X, Loader2, MoreVertical, Bookmark,
  Edit3, Trash2, Plus, TrendingUp, Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  const [activeTab, setActiveTab] = useState<'feed' | 'my-posts'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio' | 'article' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
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
  }, [user?.id]);

  const loadPosts = useCallback(() => {
    // Load from localStorage (simulated)
    const savedPosts = localStorage.getItem(`community_posts_${user?.id}`);
    const savedMyPosts = localStorage.getItem(`my_posts_${user?.id}`);
    
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch (e) {
        console.warn('Failed to parse posts');
      }
    }
    
    if (savedMyPosts) {
      try {
        setMyPosts(JSON.parse(savedMyPosts));
      } catch (e) {
        console.warn('Failed to parse my posts');
      }
    }
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
      
      // Create preview for images and videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCreatePost = useCallback(() => {
    if (!newPostContent.trim() && !mediaFile) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author_id: user?.id || '',
      author_name: `${user?.firstName} ${user?.lastName}`,
      author_avatar: user?.profilePicture,
      content: newPostContent,
      media_type: selectedMediaType || undefined,
      media_url: mediaPreview || undefined,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      liked_by_user: false
    };

    const updatedPosts = [newPost, ...posts];
    const updatedMyPosts = [newPost, ...myPosts];
    
    setPosts(updatedPosts);
    setMyPosts(updatedMyPosts);
    
    localStorage.setItem(`community_posts_${user?.id}`, JSON.stringify(updatedPosts));
    localStorage.setItem(`my_posts_${user?.id}`, JSON.stringify(updatedMyPosts));

    // Reset form
    setNewPostContent('');
    setSelectedMediaType(null);
    setMediaFile(null);
    setMediaPreview(null);
    setShowCreatePost(false);
  }, [newPostContent, mediaFile, mediaPreview, selectedMediaType, posts, myPosts, user]);

  const handleLikePost = (postId: string) => {
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
  };

  const handleDeletePost = (postId: string) => {
    const updatedPosts = posts.filter(p => p.id !== postId);
    const updatedMyPosts = myPosts.filter(p => p.id !== postId);
    
    setPosts(updatedPosts);
    setMyPosts(updatedMyPosts);
    
    localStorage.setItem(`community_posts_${user?.id}`, JSON.stringify(updatedPosts));
    localStorage.setItem(`my_posts_${user?.id}`, JSON.stringify(updatedMyPosts));
  };

  const PostCard: React.FC<{ post: Post; showActions?: boolean }> = ({ post, showActions = true }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Post Content */}
      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-cover" />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <video src={post.media_url} controls className="w-full max-h-96" />
        </div>
      )}
      {post.media_url && post.media_type === 'audio' && (
        <div className="mb-4">
          <audio src={post.media_url} controls className="w-full" />
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
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bookmark className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Hub</h1>
            <p className="text-gray-600">Share your journey, connect with others, and stay inspired</p>
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
                  </nav>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {activeTab === 'feed' ? (
                  posts.length > 0 ? (
                    posts.map(post => <PostCard key={post.id} post={post} />)
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
                ) : (
                  myPosts.length > 0 ? (
                    myPosts.map(post => (
                      <div key={post.id} className="relative">
                        <PostCard post={post} showActions={false} />
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
                )}
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
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 resize-none"
              />

              {/* Media Preview */}
              {mediaPreview && selectedMediaType === 'image' && (
                <div className="mt-4 relative">
                  <img src={mediaPreview} alt="Preview" className="w-full rounded-lg" />
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
                  <video src={mediaPreview} controls className="w-full rounded-lg" />
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
    </div>
  );
};

export default React.memo(CommunityHub);

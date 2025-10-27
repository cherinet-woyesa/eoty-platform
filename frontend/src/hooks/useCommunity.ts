import { useState, useEffect } from 'react';
import { forumsApi, achievementsApi } from '../services/api';
import type { Forum, ForumTopic, ForumPost, UserBadge, LeaderboardEntry } from '../types/community';

export const useForums = () => {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForums = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await forumsApi.getForums();
      
      if (response.success) {
        setForums(response.data.forums);
      } else {
        setError('Failed to fetch forums');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch forums');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForums();
  }, []);

  return {
    forums,
    loading,
    error,
    refetch: fetchForums
  };
};

export const useForumTopics = (forumId: number) => {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTopics = async (newPage: number = 1) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await forumsApi.getTopics(forumId, newPage, 20);
      
      if (response.success) {
        if (newPage === 1) {
          setTopics(response.data.topics);
        } else {
          setTopics(prev => [...prev, ...response.data.topics]);
        }
        
        setHasMore(response.data.topics.length === 20);
        setPage(newPage);
      } else {
        setError('Failed to fetch topics');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchTopics(page + 1);
    }
  };

  useEffect(() => {
    if (forumId) {
      fetchTopics(1);
    }
  }, [forumId]);

  return {
    topics,
    loading,
    error,
    hasMore,
    fetchTopics,
    loadMore,
    refetch: () => fetchTopics(1)
  };
};

export const useForumTopic = (topicId: number) => {
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopic = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await forumsApi.getTopic(topicId);
      
      if (response.success) {
        setTopic(response.data.topic);
        setPosts(response.data.posts);
      } else {
        setError('Failed to fetch topic');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch topic');
    } finally {
      setLoading(false);
    }
  };

  const addPost = async (content: string, parentId?: number) => {
    try {
      const response = await forumsApi.createPost({
        topicId,
        content,
        parentId
      });

      if (response.success) {
        await fetchTopic(); // Refresh topic and posts
        return response.data.post;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create post');
    }
  };

  const likePost = async (postId: number) => {
    try {
      const response = await forumsApi.likePost(postId);
      
      if (response.success) {
        // Update local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, like_count: post.like_count + 1 }
              : post
          )
        );
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to like post');
    }
  };

  useEffect(() => {
    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  return {
    topic,
    posts,
    loading,
    error,
    addPost,
    likePost,
    refetch: fetchTopic
  };
};

export const useAchievements = () => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await achievementsApi.getUserBadges();
      
      if (response.success) {
        setBadges(response.data.badges);
        setTotalPoints(response.data.total_points);
      } else {
        setError('Failed to fetch badges');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  return {
    badges,
    totalPoints,
    loading,
    error,
    refetch: fetchBadges
  };
};

export const useLeaderboard = (type: string = 'chapter', period: string = 'current') => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (newType?: string, newPeriod?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentType = newType || type;
      const currentPeriod = newPeriod || period;
      
      const response = await achievementsApi.getLeaderboard(currentType, currentPeriod);
      
      if (response.success) {
        setLeaderboard(response.data.leaderboard);
        setUserRank(response.data.user_rank);
      } else {
        setError('Failed to fetch leaderboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const updateAnonymity = async (isAnonymous: boolean) => {
    try {
      const response = await achievementsApi.updateAnonymity(isAnonymous);
      
      if (response.success) {
        await fetchLeaderboard(); // Refresh leaderboard
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update anonymity');
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [type, period]);

  return {
    leaderboard,
    userRank,
    loading,
    error,
    fetchLeaderboard,
    updateAnonymity,
    refetch: () => fetchLeaderboard()
  };
};
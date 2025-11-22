import { useState, useEffect } from 'react';
import { forumsApi, achievementsApi } from '@/services/api';

// Types
import type { Forum, ForumTopic, ForumPost, UserBadge, LeaderboardEntry } from '@/types/community';

// Forum hooks
export const useForums = () => {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    try {
      setLoading(true);
      const response = await forumsApi.getForums();
      setForums(response.data.forums);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forums');
    } finally {
      setLoading(false);
    }
  };

  return { forums, loading, error, refetch: fetchForums };
};

export const useForumTopics = (forumId: number) => {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (forumId) {
      fetchTopics();
    }
  }, [forumId]);

  const fetchTopics = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await forumsApi.getTopics(forumId, pageNum);
      if (pageNum === 1) {
        setTopics(response.data.topics);
      } else {
        setTopics(prev => [...prev, ...response.data.topics]);
      }
      setHasMore(response.data.topics.length === 20); // Assuming 20 per page
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTopics(nextPage);
    }
  };

  return { topics, loading, error, hasMore, loadMore };
};

export const useForumTopic = (topicId: number) => {
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await forumsApi.getTopic(topicId);
      setTopic(response.data.topic);
      setPosts(response.data.posts);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topic');
    } finally {
      setLoading(false);
    }
  };

  return { topic, posts, loading, error, refetch: fetchTopic };
};

// Achievement hooks
export const useAchievements = () => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await achievementsApi.getUserBadges();
      setBadges(response.data.badges);
      setTotalPoints(response.data.total_points);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch achievements');
    } finally {
      setLoading(false);
    }
  };

  return { badges, totalPoints, loading, error, refetch: fetchAchievements };
};

export const useLeaderboard = (type: 'chapter' | 'global' = 'chapter', period: 'current' | 'weekly' | 'monthly' = 'current') => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [type, period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await achievementsApi.getLeaderboard(type, period);
      setLeaderboard(response.data.leaderboard);
      setUserRank(response.data.user_rank);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const updateAnonymity = async (isAnonymous: boolean) => {
    try {
      await achievementsApi.updateAnonymity(isAnonymous);
      fetchLeaderboard(); // Refresh leaderboard
    } catch (err: any) {
      setError(err.message || 'Failed to update anonymity setting');
    }
  };

  return { leaderboard, userRank, loading, error, updateAnonymity, refetch: fetchLeaderboard };
};

// Topic detail hook
export const useTopicDetail = (topicId: number) => {
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (topicId) {
      fetchTopicDetail();
    }
  }, [topicId]);

  const fetchTopicDetail = async () => {
    try {
      setLoading(true);
      const response = await forumsApi.getTopic(topicId);
      setTopic(response.data.topic);
      setReplies(response.data.replies || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch topic');
    } finally {
      setLoading(false);
    }
  };

  const likeTopic = async () => {
    if (!topic) return;
    try {
      await forumsApi.likeTopic(topic.id);
      // Update local state
      setTopic(prev => prev ? {
        ...prev,
        user_liked: !prev.user_liked,
        likes_count: prev.user_liked ? (prev.likes_count || 0) - 1 : (prev.likes_count || 0) + 1
      } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to like topic');
    }
  };

  const replyToTopic = async (content: string) => {
    if (!topic) return;
    try {
      await forumsApi.createReply(topic.id, { content });
      // Refresh topic to get updated replies
      fetchTopicDetail();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    }
  };

  const shareTopic = async () => {
    if (!topic) return;
    try {
      const response = await forumsApi.shareTopic(topic.id);
      // Copy share link to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(response.data.shareLink);
      }
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
      throw err;
    }
  };

  const reportTopic = async (reason: string, details?: string) => {
    if (!topic) return;
    try {
      await forumsApi.reportTopic(topic.id, reason, details);
    } catch (err: any) {
      setError(err.message || 'Failed to report topic');
      throw err;
    }
  };

  return { topic, replies, loading, error, likeTopic, replyToTopic, shareTopic, reportTopic, refetch: fetchTopicDetail };
};
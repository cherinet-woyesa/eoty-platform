import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Clock, Users, Star, TrendingUp, Brain, Zap, Target, 
  Heart, Share2, Filter, Sparkles, Lock, Crown, Award 
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'course' | 'lesson' | 'path' | 'challenge';
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  rating: number;
  students: number;
  progress?: number;
  matchScore: number;
  tags: string[];
  thumbnail?: string;
  reason: string;
  isNew?: boolean;
  isPopular?: boolean;
  isPremium?: boolean;
  pointsReward?: number;
  completionTime?: string;
}

interface LearningRecommendationsProps {
  recommendations: Recommendation[];
  onRecommendationAction?: (recommendationId: string, action: string) => void;
}

const LearningRecommendations: React.FC<LearningRecommendationsProps> = ({ 
  recommendations,
  onRecommendationAction 
}) => {
  const [filterType, setFilterType] = useState<'all' | 'course' | 'path' | 'challenge'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'popularity' | 'duration' | 'rating'>('match');
  const [likedRecommendations, setLikedRecommendations] = useState<Set<string>>(new Set());

  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(rec => rec.type === filterType);
    }

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(rec => rec.difficulty === filterDifficulty);
    }

    // Apply sorting
    switch (sortBy) {
      case 'match':
        return [...filtered].sort((a, b) => b.matchScore - a.matchScore);
      case 'popularity':
        return [...filtered].sort((a, b) => b.students - a.students);
      case 'duration':
        return [...filtered].sort((a, b) => a.duration - b.duration);
      case 'rating':
        return [...filtered].sort((a, b) => b.rating - a.rating);
      default:
        return filtered;
    }
  }, [recommendations, filterType, filterDifficulty, sortBy]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4" />;
      case 'lesson':
        return <Clock className="h-4 w-4" />;
      case 'path':
        return <Target className="h-4 w-4" />;
      case 'challenge':
        return <Zap className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'from-blue-500 to-blue-600';
      case 'lesson':
        return 'from-green-500 to-green-600';
      case 'path':
        return 'from-purple-500 to-purple-600';
      case 'challenge':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('similar') || reason.includes('based')) return <Brain className="h-3 w-3" />;
    if (reason.includes('popular')) return <TrendingUp className="h-3 w-3" />;
    if (reason.includes('completes')) return <Target className="h-3 w-3" />;
    if (reason.includes('trending')) return <Sparkles className="h-3 w-3" />;
    return <Zap className="h-3 w-3" />;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleRecommendationClick = useCallback((recommendation: Recommendation) => {
    onRecommendationAction?.(recommendation.id, 'view');
    console.log('Recommendation clicked:', recommendation.id, recommendation.matchScore);
  }, [onRecommendationAction]);

  const toggleLike = useCallback((recommendationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recommendationId)) {
        newSet.delete(recommendationId);
        onRecommendationAction?.(recommendationId, 'unlike');
      } else {
        newSet.add(recommendationId);
        onRecommendationAction?.(recommendationId, 'like');
      }
      return newSet;
    });
  }, [onRecommendationAction]);

  const shareRecommendation = useCallback((recommendation: Recommendation, e: React.MouseEvent) => {
    e.stopPropagation();
    onRecommendationAction?.(recommendation.id, 'share');
    
    if (navigator.share) {
      navigator.share({
        title: recommendation.title,
        text: recommendation.description,
        url: `${window.location.origin}/${recommendation.type}s/${recommendation.id}`,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${recommendation.title} - ${window.location.origin}/${recommendation.type}s/${recommendation.id}`);
      // You could show a toast notification here
      console.log('Link copied to clipboard');
    }
  }, [onRecommendationAction]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-green-600';
    if (score >= 75) return 'from-blue-500 to-blue-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-gray-500 to-gray-600';
  };

  const RecommendationCardSkeleton: React.FC = () => (
    <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="h-32 bg-gradient-to-r from-gray-300 to-gray-400"></div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
        </div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-full"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      </div>
    </div>
  );

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            Learning Recommendations
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Brain className="h-4 w-4" />
            <span>AI-Powered</span>
          </div>
        </div>
        
        <div className="text-center py-12">
          <div className="relative inline-block mb-4">
            <Brain className="h-16 w-16 text-gray-300 mx-auto" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No recommendations yet</h4>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Complete more lessons and rate your learning experience to get personalized AI recommendations tailored to your interests.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Explore Courses
            </Link>
            <button
              onClick={() => onRecommendationAction?.('refresh', 'refresh')}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Refresh Recommendations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            Learning Recommendations
          </h3>
          <p className="text-gray-600 mt-1">
            {filteredAndSortedRecommendations.length} personalized recommendation{filteredAndSortedRecommendations.length !== 1 ? 's' : ''} • AI-powered for you
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Types</option>
            <option value="course">Courses</option>
            <option value="path">Learning Paths</option>
            <option value="challenge">Challenges</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="match">Best Match</option>
            <option value="popularity">Most Popular</option>
            <option value="duration">Shortest First</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedRecommendations.slice(0, 6).map((recommendation) => (
          <div
            key={recommendation.id}
            className="border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleRecommendationClick(recommendation)}
          >
            {/* Header with match score and badges */}
            <div className={`bg-gradient-to-r ${getTypeColor(recommendation.type)} p-4 text-white relative overflow-hidden`}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 right-2 text-4xl">✨</div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-white/20 rounded-lg">
                      {getTypeIcon(recommendation.type)}
                    </div>
                    <span className="text-sm font-medium capitalize">{recommendation.type}</span>
                  </div>
                  
                  {/* Premium Badge */}
                  {recommendation.isPremium && (
                    <div className="flex items-center space-x-1 bg-yellow-500/20 rounded-full px-2 py-1 text-xs">
                      <Crown className="h-3 w-3" />
                      <span>Premium</span>
                    </div>
                  )}
                </div>
                
                {/* Match Score */}
                <div className={`flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1 text-xs w-fit ${
                  recommendation.matchScore >= 90 ? 'animate-pulse' : ''
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-semibold">{recommendation.matchScore}% match</span>
                </div>
                
                {/* Progress bar for ongoing items */}
                {recommendation.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/80 mb-1">
                      <span>Your progress</span>
                      <span>{recommendation.progress}%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-1.5">
                      <div
                        className="bg-white h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${recommendation.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title and badges */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors flex-1 mr-2">
                  {recommendation.title}
                </h4>
                <div className="flex space-x-1">
                  {recommendation.isNew && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      New
                    </span>
                  )}
                  {recommendation.isPopular && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Hot
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {recommendation.description}
              </p>

              {/* Reason for recommendation */}
              <div className="flex items-center space-x-2 text-xs text-purple-600 mb-3 p-2 bg-purple-50 rounded-lg">
                {getReasonIcon(recommendation.reason)}
                <span className="font-medium">{recommendation.reason}</span>
              </div>

              {/* Points reward */}
              {recommendation.pointsReward && (
                <div className="flex items-center space-x-1 text-xs text-yellow-600 mb-3">
                  <Award className="h-3 w-3" />
                  <span className="font-medium">+{recommendation.pointsReward} points on completion</span>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2 text-xs text-gray-500 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(recommendation.duration)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{recommendation.students.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{recommendation.rating.toFixed(1)}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(recommendation.difficulty)}`}>
                    {recommendation.difficulty}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {recommendation.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
                {recommendation.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    +{recommendation.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Link
                  to={`/${recommendation.type}s/${recommendation.id}`}
                  className={`flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    recommendation.isPremium
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } group-hover:shadow-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {recommendation.progress 
                    ? 'Continue' 
                    : recommendation.isPremium 
                      ? 'Unlock Premium' 
                      : 'Start Learning'
                  }
                  {recommendation.isPremium && <Lock className="h-3 w-3 ml-1" />}
                </Link>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => toggleLike(recommendation.id, e)}
                    className={`p-2 transition-colors rounded-lg ${
                      likedRecommendations.has(recommendation.id)
                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                        : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 ${likedRecommendations.has(recommendation.id) ? 'fill-current' : ''}`} 
                    />
                  </button>
                  
                  <button
                    onClick={(e) => shareRecommendation(recommendation, e)}
                    className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-colors rounded-lg"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Recommendations */}
      {filteredAndSortedRecommendations.length > 6 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <Link
            to="/recommendations"
            className="w-full text-center block text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All {filteredAndSortedRecommendations.length} Recommendations
          </Link>
        </div>
      )}

      {/* AI Explanation */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-start space-x-3">
          <Brain className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-purple-900 mb-1">How these recommendations work</h4>
            <p className="text-xs text-purple-700">
              Our AI analyzes your learning patterns, completed courses, and interests to suggest the most relevant content. 
              The match score indicates how well each recommendation aligns with your learning goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LearningRecommendations);
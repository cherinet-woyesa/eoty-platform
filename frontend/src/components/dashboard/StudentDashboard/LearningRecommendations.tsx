import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Users, Star, TrendingUp, Brain, Zap, Target } from 'lucide-react';

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
}

interface LearningRecommendationsProps {
  recommendations: Recommendation[];
}

const LearningRecommendations: React.FC<LearningRecommendationsProps> = ({ recommendations }) => {
  const sortedRecommendations = useMemo(() => {
    return [...recommendations].sort((a, b) => b.matchScore - a.matchScore);
  }, [recommendations]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getReasonIcon = (reason: string) => {
    if (reason.includes('similar')) return <TrendingUp className="h-3 w-3" />;
    if (reason.includes('popular')) return <Users className="h-3 w-3" />;
    if (reason.includes('completes')) return <Target className="h-3 w-3" />;
    return <Brain className="h-3 w-3" />;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleRecommendationClick = useCallback((recommendation: Recommendation) => {
    // Track recommendation click for ML model improvement
    console.log('Recommendation clicked:', recommendation.id, recommendation.matchScore);
  }, []);

  if (sortedRecommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-500" />
          Learning Recommendations
        </h3>
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No recommendations yet</p>
          <p className="text-gray-400 text-sm">
            Complete more lessons to get personalized recommendations
          </p>
        </div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRecommendations.slice(0, 3).map((recommendation) => (
          <div
            key={recommendation.id}
            className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
            onClick={() => handleRecommendationClick(recommendation)}
          >
            {/* Header with match score */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(recommendation.type)}
                  <span className="text-sm font-medium capitalize">{recommendation.type}</span>
                </div>
                <div className="flex items-center space-x-1 bg-white/20 rounded-full px-2 py-1 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  <span>{recommendation.matchScore}% match</span>
                </div>
              </div>
              
              {/* Progress bar for ongoing items */}
              {recommendation.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-white/30 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${recommendation.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/80 mt-1">
                    {recommendation.progress}% complete
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                {recommendation.title}
              </h4>
              
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {recommendation.description}
              </p>

              {/* Reason for recommendation */}
              <div className="flex items-center space-x-1 text-xs text-purple-600 mb-3">
                {getReasonIcon(recommendation.reason)}
                <span>{recommendation.reason}</span>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs text-gray-500">
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
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recommendation.difficulty)}`}>
                    {recommendation.difficulty}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {recommendation.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
                {recommendation.tags.length > 2 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    +{recommendation.tags.length - 2} more
                  </span>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4">
                <Link
                  to={`/${recommendation.type}s/${recommendation.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors group-hover:shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {recommendation.progress ? 'Continue' : 'Start Learning'}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          to="/recommendations"
          className="w-full text-center block text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          View All Recommendations
        </Link>
      </div>
    </div>
  );
};

export default React.memo(LearningRecommendations);
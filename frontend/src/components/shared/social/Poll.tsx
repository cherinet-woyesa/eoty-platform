import React, { useState } from 'react';
import { BarChart3, Users, Clock, CheckCircle, Plus } from 'lucide-react';
import { forumApi } from '../../../services/api/forums';

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  order_index: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string;
  allow_multiple_votes: boolean;
  is_anonymous: boolean;
  ends_at?: string;
  created_by: string;
  options: PollOption[];
  userVotes: string[];
  hasVoted: boolean;
}

interface PollProps {
  poll: Poll;
  topicId: string;
  onVote?: () => void;
  canCreate?: boolean;
  onCreatePoll?: () => void;
}

const Poll: React.FC<PollProps> = ({
  poll,
  topicId,
  onVote,
  canCreate = false,
  onCreatePoll
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.userVotes || []);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(poll.hasVoted);

  const totalVotes = poll.options.reduce((sum, option) => sum + option.vote_count, 0);
  const hasEnded = poll.ends_at && new Date() > new Date(poll.ends_at);

  const handleVote = async () => {
    if (selectedOptions.length === 0 || isVoting) return;

    try {
      setIsVoting(true);
      await forumApi.votePoll(poll.id, selectedOptions);
      setShowResults(true);
      onVote?.();
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleOptionToggle = (optionId: string) => {
    if (poll.hasVoted || hasEnded) return;

    if (poll.allow_multiple_votes) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const getVotePercentage = (voteCount: number) => {
    return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  };

  if (!poll && canCreate) {
    return (
      <div className="bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 border border-[#27AE60]/20 rounded-lg p-6 text-center">
        <BarChart3 className="h-12 w-12 text-[#27AE60] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Create a Poll</h3>
        <p className="text-gray-600 mb-4">Engage your community with polls and gather opinions</p>
        <button
          onClick={onCreatePoll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Poll
        </button>
      </div>
    );
  }

  if (!poll) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Poll Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{poll.question}</h3>
          {poll.description && (
            <p className="text-gray-600 text-sm">{poll.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {poll.ends_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{hasEnded ? 'Ended' : `Ends ${new Date(poll.ends_at).toLocaleDateString()}`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Poll Options */}
      <div className="space-y-3 mb-4">
        {poll.options.map((option) => {
          const percentage = getVotePercentage(option.vote_count);
          const isSelected = selectedOptions.includes(option.id);
          const hasUserVoted = poll.userVotes.includes(option.id);

          return (
            <div key={option.id} className="relative">
              {showResults ? (
                // Results view
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {hasUserVoted && <CheckCircle className="h-4 w-4 text-[#27AE60]" />}
                      <span className="text-sm font-medium text-gray-900">
                        {option.option_text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{option.vote_count}</span>
                      <span>({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        hasUserVoted ? 'bg-[#27AE60]' : 'bg-[#2980B9]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ) : (
                // Voting view
                <button
                  onClick={() => handleOptionToggle(option.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-[#27AE60] bg-[#27AE60]/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={hasEnded}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-[#27AE60] bg-[#27AE60]' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm text-gray-900">{option.option_text}</span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {poll.allow_multiple_votes && (
            <span>Multiple votes allowed</span>
          )}
          {poll.is_anonymous && (
            <span>Anonymous voting</span>
          )}
        </div>

        {!showResults && !hasEnded && (
          <button
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isVoting}
            className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white text-sm rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isVoting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            Vote
          </button>
        )}

        {!showResults && !poll.hasVoted && (
          <button
            onClick={() => setShowResults(true)}
            className="px-4 py-2 text-[#27AE60] text-sm hover:bg-[#27AE60]/10 rounded-lg transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
};

export default Poll;

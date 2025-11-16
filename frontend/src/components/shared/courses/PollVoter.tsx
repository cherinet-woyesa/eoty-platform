import React, { useState, useEffect } from 'react';
import { interactiveApi } from '@/services/api/interactive';
import { CheckCircle2, BarChart3, Users, Loader } from 'lucide-react';

interface PollOption {
  id: number;
  text: string;
}

interface PollResult {
  option_id: number;
  option_text: string;
  count: number;
  percentage: string;
}

interface Poll {
  id: number;
  question: string;
  description?: string;
  options: PollOption[];
  allow_multiple_choice: boolean;
  show_results_before_voting: boolean;
  show_results_after_voting: boolean;
  total_responses: number;
}

interface PollVoterProps {
  pollId: number;
  lessonId: number;
  onVoteComplete?: () => void;
}

const PollVoter: React.FC<PollVoterProps> = ({ pollId, lessonId, onVoteComplete }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<PollResult[] | null>(null);
  const [userResponse, setUserResponse] = useState<{ option_id: number; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await interactiveApi.getPoll(pollId);
      
      if (response.success) {
        setPoll(response.data.poll);
        setResults(response.data.results);
        setUserResponse(response.data.userResponse);
        setShowResults(response.data.results !== null);
      }
    } catch (err) {
      console.error('Failed to load poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedOption) return;

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await interactiveApi.submitPollVote(pollId, selectedOption);
      
      if (response.success) {
        setResults(response.data.results);
        setUserResponse({ option_id: selectedOption, created_at: new Date().toISOString() });
        setShowResults(true);
        if (onVoteComplete) {
          onVoteComplete();
        }
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600 text-center py-4">
          {error || 'Poll not found'}
        </div>
      </div>
    );
  }

  const canVote = !userResponse && poll.show_results_after_voting;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{poll.question}</h3>
        {poll.description && (
          <p className="text-gray-600 text-sm mb-4">{poll.description}</p>
        )}
      </div>

      {!showResults && !userResponse ? (
        // Voting interface
        <div>
          <div className="space-y-3 mb-6">
            {poll.options.map((option) => (
              <label
                key={option.id}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type={poll.allow_multiple_choice ? 'checkbox' : 'radio'}
                  name="poll-option"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => setSelectedOption(option.id)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1 text-gray-900">{option.text}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedOption || submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {submitting ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Vote'
            )}
          </button>
        </div>
      ) : (
        // Results display
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-gray-600">
              <Users className="h-5 w-5 mr-2" />
              <span className="font-semibold">{poll.total_responses} {poll.total_responses === 1 ? 'vote' : 'votes'}</span>
            </div>
            {userResponse && (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span className="text-sm">You voted</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {results && results.map((result) => {
              const isUserChoice = userResponse?.option_id === result.option_id;
              return (
                <div key={result.option_id} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isUserChoice ? 'text-blue-600' : 'text-gray-700'}`}>
                      {result.option_text}
                      {isUserChoice && <span className="ml-2 text-xs">(Your vote)</span>}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      {result.percentage}% ({result.count})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUserChoice ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!userResponse && poll.show_results_after_voting && (
            <button
              onClick={() => setShowResults(false)}
              className="mt-4 w-full py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Vote Now
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default PollVoter;


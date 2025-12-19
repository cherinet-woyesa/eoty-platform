import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { interactiveApi } from '@/services/api';
import { brandColors } from '@/theme/brand';

interface Poll {
  id: number;
  question: string;
  description?: string;
  options: Array<{ id: number; text: string }>;
  total_responses: number;
  created_at: string;
}

interface LessonPollsProps {
  lessonId: number;
  onPollCountChange?: (count: number) => void;
}

const LessonPolls: React.FC<LessonPollsProps> = ({ lessonId, onPollCountChange }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [deletingPollId, setDeletingPollId] = useState<number | null>(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadPolls();
  }, [lessonId]);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await interactiveApi.getLessonPolls(lessonId);
      
      if (response.success) {
        setPolls(response.data.polls);
        onPollCountChange?.(response.data.polls.length);
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      setDeletingPollId(pollId);
      const response = await interactiveApi.deletePoll(pollId);
      
      if (response.success) {
        setPolls(polls.filter(p => p.id !== pollId));
      }
    } catch (err) {
      console.error('Failed to delete poll:', err);
      alert('Failed to delete poll. Please try again.');
    } finally {
      setDeletingPollId(null);
    }
  };

  const handlePollCreated = () => {
    setShowCreator(false);
    loadPolls();
  };

  const handlePollDeleted = async (pollId: number) => {
    try {
      setDeletingPollId(pollId);
      await interactiveApi.deleteLessonPoll(lessonId, pollId);
      loadPolls();
    } catch (error) {
      console.error('Failed to delete poll:', error);
    } finally {
      setDeletingPollId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white/90 to-stone-50/90 rounded-lg shadow-sm p-4 border border-stone-200/50">
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <Loader className="h-6 w-6 animate-spin mx-auto mb-2" style={{ color: brandColors.primaryHex }} />
            <p className="text-sm text-stone-600">Loading interactive polls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#27AE60]" />
          <h3 className="text-lg font-semibold text-stone-800">Interactive Polls</h3>
          {polls.length > 0 && (
            <span className="px-2 py-1 bg-[#27AE60]/20 text-[#27AE60] text-xs font-bold rounded-full">
              {polls.length}
            </span>
          )}
        </div>
        {isTeacherOrAdmin && (
          <button
            onClick={() => setShowCreator(!showCreator)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg ${
              showCreator
                ? 'bg-white/80 hover:bg-white text-stone-800 border border-stone-300'
                : 'bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 border border-[#27AE60]/50'
            }`}
          >
            <Plus className="h-4 w-4" />
            {showCreator ? 'Cancel' : 'Create Poll'}
          </button>
        )}
      </div>

      {showCreator && (
        <PollCreator
          lessonId={lessonId}
          onPollCreated={handlePollCreated}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {error && (
        <div className="bg-red-50/80 border border-red-200/60 rounded-lg p-3 text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Error:</span>
            {error}
          </div>
        </div>
      )}

      {polls.length === 0 && !showCreator ? (
        <div className="bg-gradient-to-br from-stone-50/80 to-white/80 rounded-lg p-6 text-center border border-stone-200/50">
          <MessageSquare className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-stone-600 text-sm mb-3">No interactive polls yet</p>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setShowCreator(true)}
              className="text-[#27AE60] hover:text-[#16A085] font-semibold text-sm transition-colors duration-200"
            >
              Create the first poll →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="relative">
              {isTeacherOrAdmin && (
                <button
                  onClick={() => handleDeletePoll(poll.id)}
                  disabled={deletingPollId === poll.id}
                  className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete poll"
                >
                  {deletingPollId === poll.id ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              )}
              <PollVoter
                pollId={poll.id}
                lessonId={lessonId}
                onVoteComplete={loadPolls}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonPolls;


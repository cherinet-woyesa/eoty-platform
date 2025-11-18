import React, { useState, useEffect } from 'react';
import { interactiveApi } from '@/services/api/interactive';
import PollVoter from './PollVoter';
import PollCreator from './PollCreator';
import { Plus, Trash2, Loader, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
}

const LessonPolls: React.FC<LessonPollsProps> = ({ lessonId }) => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading polls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Lesson Polls</h3>
        </div>
        {isTeacherOrAdmin && (
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Error:</span>
            {error}
          </div>
        </div>
      )}

      {polls.length === 0 && !showCreator ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm mb-3">No polls available for this lesson</p>
          {isTeacherOrAdmin && (
            <button
              onClick={() => setShowCreator(true)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
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


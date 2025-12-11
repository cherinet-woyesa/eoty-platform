import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, Users, Eye, EyeOff } from 'lucide-react';
import { forumApi } from '../../../services/api/forums';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  onPollCreated?: () => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  topicId,
  onPollCreated
}) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) {
      setError('Question is required');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      const pollData = {
        question: question.trim(),
        description: description.trim() || undefined,
        options: validOptions,
        allowMultipleVotes,
        isAnonymous,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined
      };

      await forumApi.createPoll(topicId, pollData);
      onPollCreated?.();
      onClose();

      // Reset form
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setAllowMultipleVotes(false);
      setIsAnonymous(false);
      setEndsAt('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create poll');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Poll</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Question */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] resize-none"
              maxLength={500}
            />
          </div>

          {/* Options */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Options *
              </label>
              <button
                onClick={addOption}
                disabled={options.length >= 10}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-[#27AE60]/10 text-[#27AE60] rounded-md hover:bg-[#27AE60]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
                Add Option
              </button>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum 2 options required, maximum 10 options allowed
            </p>
          </div>

          {/* Poll Settings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Poll Settings</h3>
            <div className="space-y-3">
              {/* Multiple Votes */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allowMultipleVotes}
                  onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                  className="w-4 h-4 text-[#27AE60] border-gray-300 rounded focus:ring-[#27AE60]"
                />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Allow multiple votes per person</span>
                </div>
              </label>

              {/* Anonymous Voting */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-[#27AE60] border-gray-300 rounded focus:ring-[#27AE60]"
                />
                <div className="flex items-center gap-2">
                  {isAnonymous ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm text-gray-700">Anonymous voting</span>
                </div>
              </label>

              {/* End Date */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">End date (optional)</span>
                </div>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white text-indigo-900 border border-indigo-200 hover:border-indigo-400 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePoll}
              disabled={!question.trim() || options.filter(opt => opt.trim()).length < 2 || isCreating}
              className="flex-1 px-4 py-2 bg-indigo-900 text-white border border-indigo-800 hover:bg-indigo-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Poll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePollModal;

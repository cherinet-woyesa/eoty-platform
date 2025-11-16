import React, { useState } from 'react';
import { interactiveApi } from '@/services/api/interactive';
import { Plus, X, Save, Loader } from 'lucide-react';

interface PollCreatorProps {
  lessonId: number;
  onPollCreated?: () => void;
  onCancel?: () => void;
}

const PollCreator: React.FC<PollCreatorProps> = ({ lessonId, onPollCreated, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false);
  const [showResultsBeforeVoting, setShowResultsBeforeVoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    // Validation
    if (!question.trim()) {
      setError('Question is required');
      return;
    }

    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const pollData = {
        question: question.trim(),
        description: description.trim() || null,
        options: validOptions.map((opt, index) => ({
          id: index + 1,
          text: opt.trim()
        })),
        allow_multiple_choice: allowMultipleChoice,
        show_results_before_voting: showResultsBeforeVoting,
        show_results_after_voting: true
      };

      const response = await interactiveApi.createPoll(lessonId, pollData);

      if (response.success) {
        // Reset form
        setQuestion('');
        setDescription('');
        setOptions(['', '']);
        setAllowMultipleChoice(false);
        setShowResultsBeforeVoting(false);
        
        if (onPollCreated) {
          onPollCreated();
        }
      }
    } catch (err) {
      console.error('Failed to create poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Poll</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your poll question..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context or additional information..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options <span className="text-red-500">*</span> (At least 2 required)
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allowMultipleChoice}
              onChange={(e) => setAllowMultipleChoice(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Allow multiple choice</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showResultsBeforeVoting}
              onChange={(e) => setShowResultsBeforeVoting(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show results before voting</span>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {submitting ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Poll
              </>
            )}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollCreator;


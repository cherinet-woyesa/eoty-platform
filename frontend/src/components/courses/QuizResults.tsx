import React from 'react';
import { Award, CheckCircle, XCircle, BookOpen, ArrowLeft } from 'lucide-react';

interface QuizResult {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  question_text: string;
}

interface QuizResultsProps {
  attemptId: string;
  results: {
    score: number;
    max_score: number;
    percentage: number;
    results: QuizResult[];
  };
  onClose: () => void;
  onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ results, onClose, onRetake }) => {
  const { score, max_score, percentage, results: quizResults } = results;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeText = (percentage: number) => {
    if (percentage >= 90) return 'Excellent!';
    if (percentage >= 80) return 'Good Job!';
    if (percentage >= 70) return 'Not Bad!';
    return 'Keep Practicing!';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quiz Results</h2>
                <p className="text-gray-600 text-sm">See how you performed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getGradeColor(percentage)} mb-2`}>
                {score}/{max_score}
              </div>
              <div className="text-lg font-semibold text-gray-900">{getGradeText(percentage)}</div>
              <div className="text-sm text-gray-600">{percentage}% Correct</div>
            </div>

            {/* Performance */}
            <div className="text-center">
              <Award className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <div className="text-lg font-semibold text-gray-900">Performance</div>
              <div className="text-sm text-gray-600">
                {quizResults.filter(r => r.is_correct).length} of {quizResults.length} correct
              </div>
            </div>

            {/* Recommendation */}
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <div className="text-lg font-semibold text-gray-900">Recommendation</div>
              <div className="text-sm text-gray-600">
                {percentage >= 80 ? 'Ready to advance!' : 'Review the material'}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h3>
          <div className="space-y-6">
            {quizResults.map((result, index) => (
              <div
                key={result.question_id}
                className={`p-4 rounded-lg border ${
                  result.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start space-x-3 mb-3">
                  {result.is_correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {index + 1}. {result.question_text}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700">Your answer:</span>
                        <span className={result.is_correct ? 'text-green-700' : 'text-red-700'}>
                          {result.user_answer || 'No answer'}
                        </span>
                      </div>
                      {!result.is_correct && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">Correct answer:</span>
                          <span className="text-green-700">{result.correct_answer}</span>
                        </div>
                      )}
                    </div>
                    {result.explanation && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-sm text-gray-700">{result.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Lesson
            </button>
            <button
              onClick={onRetake}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
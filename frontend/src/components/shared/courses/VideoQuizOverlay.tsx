import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, ChevronRight, Clock, Award, SkipForward } from 'lucide-react';
import { quizApi, type QuizTrigger } from '@/services/api/quiz';

interface VideoQuizOverlayProps {
  trigger: QuizTrigger;
  lessonId: number;
  onComplete: (score: number, passed: boolean, answeredCorrectly: boolean) => void;
  onSkip?: () => void;
}

interface QuizAnswer {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  pointsEarned: number;
}

const VideoQuizOverlay: React.FC<VideoQuizOverlayProps> = ({
  trigger,
  lessonId,
  onComplete,
  onSkip
}) => {
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAnswer | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    trigger.duration_seconds
  );
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time's up - auto-submit
          if (!submitted) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      setError('Please provide an answer before submitting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await quizApi.submitAnswer(trigger.question_id, {
        answer: userAnswer
      });

      const answerResult: QuizAnswer = {
        questionId: trigger.question_id,
        userAnswer,
        isCorrect: response.data.isCorrect,
        correctAnswer: response.data.correctAnswer,
        explanation: response.data.explanation,
        pointsEarned: response.data.pointsEarned
      };

      setResult(answerResult);
      setSubmitted(true);

      // Auto-advance after showing result for 3 seconds
      setTimeout(() => {
        const passed =
          trigger.min_score_to_proceed === null ||
          answerResult.pointsEarned >= trigger.min_score_to_proceed;
        onComplete(answerResult.pointsEarned, passed, answerResult.isCorrect);
      }, 3000);
    } catch (err: any) {
      console.error('Quiz submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit answer. Please try again.');
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !submitted && !submitting) {
      handleSubmit();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (trigger.question_type === 'multiple_choice' && trigger.options) {
      return (
        <div className="space-y-3">
          {Object.entries(trigger.options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => !submitted && setUserAnswer(key)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                userAnswer === key
                  ? 'border-[#16A085] bg-[#16A085]/10 text-[#16A085]'
                  : 'border-gray-300 hover:border-[#16A085]/50 hover:bg-gray-50'
              } ${submitted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${
                submitted && result
                  ? key === result.correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : key === userAnswer
                    ? 'border-red-500 bg-red-50'
                    : ''
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{key}.</span>
                <span className="flex-1 ml-3">{value}</span>
                {submitted && result && (
                  <>
                    {key === result.correctAnswer && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                    {key === userAnswer && key !== result.correctAnswer && (
                      <X className="h-5 w-5 text-red-600" />
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      );
    }

    // Short answer or true/false
    if (trigger.question_type === 'true_false') {
      return (
        <div className="space-y-3">
          {['True', 'False'].map((option) => (
            <button
              key={option}
              onClick={() => !submitted && setUserAnswer(option.toLowerCase())}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                userAnswer === option.toLowerCase()
                  ? 'border-[#16A085] bg-[#16A085]/10 text-[#16A085]'
                  : 'border-gray-300 hover:border-[#16A085]/50 hover:bg-gray-50'
              } ${submitted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              <span className="font-medium">{option}</span>
            </button>
          ))}
        </div>
      );
    }

    // Short answer
    return (
      <textarea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={submitted}
        placeholder="Type your answer here..."
        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-[#16A085] focus:ring-2 focus:ring-[#16A085]/20 transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        rows={4}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#16A085] to-[#27AE60] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Quiz Time!</h2>
              </div>
              <p className="text-white/90 text-sm">
                {trigger.is_required
                  ? 'This quiz is required to continue'
                  : 'Optional quiz - test your knowledge'}
              </p>
            </div>
            
            {/* Timer */}
            {timeRemaining !== null && !submitted && (
              <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5" />
                <span className="font-mono font-bold text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Question */}
          <div>
            <div className="flex items-start space-x-2 mb-4">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#16A085]/10 text-[#16A085] rounded-full font-bold">
                Q
              </span>
              <p className="flex-1 text-lg font-medium text-gray-900 leading-relaxed">
                {trigger.question_text}
              </p>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              Worth {trigger.points} point{trigger.points !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Answer Input */}
          {renderQuestionInput()}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {submitted && result && (
            <div
              className={`p-4 rounded-lg border-2 ${
                result.isCorrect
                  ? 'bg-green-50 border-green-500 text-green-900'
                  : 'bg-red-50 border-red-500 text-red-900'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {result.isCorrect ? (
                  <>
                    <Check className="h-6 w-6" />
                    <span className="font-bold text-lg">Correct! 🎉</span>
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6" />
                    <span className="font-bold text-lg">Incorrect</span>
                  </>
                )}
              </div>
              
              {result.explanation && (
                <p className="text-sm mt-2">{result.explanation}</p>
              )}
              
              {!result.isCorrect && (
                <p className="text-sm mt-2">
                  <strong>Correct answer:</strong> {result.correctAnswer}
                </p>
              )}
              
              <p className="text-sm mt-2">
                You earned <strong>{result.pointsEarned}</strong> out of{' '}
                <strong>{trigger.points}</strong> points
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="p-6 bg-gray-50 border-t flex items-center justify-between">
            {/* Skip Button */}
            {!trigger.is_required && onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <SkipForward className="h-5 w-5" />
                <span>Skip Quiz</span>
              </button>
            )}

            <div className="flex-1" />

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !userAnswer.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#16A085] to-[#27AE60] text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span>{submitting ? 'Submitting...' : 'Submit Answer'}</span>
              {!submitting && <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        )}

        {/* Auto-advancing message */}
        {submitted && (
          <div className="p-4 bg-blue-50 border-t text-center text-sm text-blue-700">
            Continuing video in 3 seconds...
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoQuizOverlay;


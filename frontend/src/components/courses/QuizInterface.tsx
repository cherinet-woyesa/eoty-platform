import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, Award, 
  ChevronLeft, ChevronRight, Play, 
  RotateCcw, AlertCircle, Loader2
} from 'lucide-react';
import { quizApi } from '../../services/api/quiz';

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: { [key: string]: string };
  correct_answer: string;
  explanation?: string;
  points: number;
  order: number;
}

interface QuizSession {
  sessionId: number;
  totalQuestions: number;
  maxPoints: number;
}

interface QuizAnswer {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer: string;
  explanation?: string;
}

interface QuizInterfaceProps {
  lessonId: number;
  onQuizComplete?: (results: any) => void;
  onClose?: () => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ 
  lessonId, 
  onQuizComplete, 
  onClose 
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [key: number]: QuizAnswer }>({});
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const hasAnswered = submittedAnswers[currentQuestion.id] !== undefined;

  useEffect(() => {
    loadQuizData();
  }, [lessonId]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleSubmitQuiz();
    }
  }, [timeRemaining]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start quiz session
      const sessionResponse = await quizApi.startQuizSession(lessonId);
      setSession(sessionResponse.data);

      // Load questions
      const questionsResponse = await quizApi.getLessonQuestions(lessonId);
      setQuestions(questionsResponse.data.questions);

      // Set timer (30 minutes for quiz)
      setTimeRemaining(30 * 60);

    } catch (err) {
      console.error('Failed to load quiz data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (answer: string) => {
    if (currentQuestion) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answer
      }));
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentAnswer.trim()) return;

    try {
      setSubmitting(true);

      const result = await quizApi.submitAnswer(currentQuestion.id, {
        answer: currentAnswer
      });
      
      setSubmittedAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          answer: currentAnswer,
          isCorrect: result.data.isCorrect,
          pointsEarned: result.data.pointsEarned,
          correctAnswer: result.data.correctAnswer,
          explanation: result.data.explanation
        }
      }));

      // Auto-advance to next question after 2 seconds
      setTimeout(() => {
        if (!isLastQuestion) {
          setCurrentQuestionIndex(prev => prev + 1);
        }
      }, 2000);

    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!session) return;

    try {
      setSubmitting(true);

      const result = await quizApi.completeQuizSession(session.sessionId);
      setResults(result.data);
      setQuizCompleted(true);
      onQuizComplete?.(result.data);

    } catch (err) {
      console.error('Failed to complete quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSubmittedAnswers({});
    setQuizCompleted(false);
    setResults(null);
    setError(null);
    loadQuizData();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Quiz</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadQuizData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (quizCompleted && results) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
          <p className="text-gray-600">Great job on completing the quiz</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{results.correctAnswers}</div>
            <div className="text-sm text-blue-800">Correct Answers</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{Math.round(results.scorePercentage)}%</div>
            <div className="text-sm text-green-800">Score</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Total Questions:</span>
            <span>{results.totalQuestions}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Points Earned:</span>
            <span>{results.totalPoints} / {results.maxPoints}</span>
          </div>
        </div>

        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleRetakeQuiz}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Retake Quiz
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Available</h3>
        <p className="text-gray-600 mb-4">This lesson doesn't have any quiz questions yet.</p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quiz</h2>
          <p className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {timeRemaining !== null && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentQuestion.question_text}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-blue-700">
            <Award className="h-4 w-4" />
            <span>{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-2">
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <label
                  key={key}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    currentAnswer === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={key}
                    checked={currentAnswer === key}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    currentAnswer === key
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {currentAnswer === key && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="font-medium mr-2">{key}.</span>
                  <span>{value}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="space-y-2">
              {['True', 'False'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    currentAnswer === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    currentAnswer === option
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {currentAnswer === option && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          )}
        </div>

        {/* Answer Feedback */}
        {hasAnswered && (
          <div className={`mt-4 p-4 rounded-lg ${
            submittedAnswers[currentQuestion.id].isCorrect
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {submittedAnswers[currentQuestion.id].isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-semibold ${
                submittedAnswers[currentQuestion.id].isCorrect
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {submittedAnswers[currentQuestion.id].isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            {!submittedAnswers[currentQuestion.id].isCorrect && (
              <p className="text-sm text-red-700 mb-2">
                Correct answer: {submittedAnswers[currentQuestion.id].correctAnswer}
              </p>
            )}
            {submittedAnswers[currentQuestion.id].explanation && (
              <p className="text-sm text-gray-700">
                {submittedAnswers[currentQuestion.id].explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousQuestion}
          disabled={isFirstQuestion}
          className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </button>

        <div className="flex space-x-2">
          {!hasAnswered ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || submitting}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Submit Answer
            </button>
          ) : (
            <>
              {!isLastQuestion ? (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Award className="h-4 w-4 mr-2" />
                  )}
                  Complete Quiz
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;

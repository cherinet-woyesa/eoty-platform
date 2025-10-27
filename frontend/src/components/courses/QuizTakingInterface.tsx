import React, { useState, useEffect } from 'react';
import { interactiveApi } from '../../services/api';
import { 
  Clock, CheckCircle, X, AlertCircle, 
  ArrowLeft, Loader, Award, BookOpen
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: any;
  points: number;
  order_number: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number | null;
  max_attempts: number;
  attempts_remaining: number;
}

interface QuizTakingInterfaceProps {
  quizId: string;
  onClose: () => void;
  onQuizComplete: (attemptId: string) => void;
}

const QuizTakingInterface: React.FC<QuizTakingInterfaceProps> = ({ 
  quizId, 
  onClose,
  onQuizComplete 
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit && timeRemaining !== null) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === 0) {
            handleSubmitQuiz();
            return 0;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz?.time_limit, timeRemaining]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await interactiveApi.getQuizForTaking(quizId);
      
      if (response.success) {
        setQuiz(response.data.quiz);
        setQuestions(response.data.questions);
        setTimeRemaining(response.data.quiz.time_limit);
        
        // Initialize empty answers
        const initialAnswers: { [key: string]: string } = {};
        response.data.questions.forEach((question: QuizQuestion) => {
          initialAnswers[question.id] = '';
        });
        setAnswers(initialAnswers);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load quiz');
      console.error('Load quiz error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Check if all questions are answered
      const unansweredQuestions = questions.filter(q => !answers[q.id]?.trim());
      if (unansweredQuestions.length > 0) {
        if (!confirm(`You have ${unansweredQuestions.length} unanswered questions. Submit anyway?`)) {
          return;
        }
      }

      const response = await interactiveApi.submitQuizAttempt(quizId, answers);
      
      if (response.success) {
        onQuizComplete(response.data.attempt_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit quiz');
      console.error('Submit quiz error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Quiz</h3>
            <p className="text-gray-600">Preparing your quiz questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Quiz</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={loadQuiz}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Quiz Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{quiz?.title}</h2>
                {quiz?.description && (
                  <p className="text-gray-600 text-sm mt-1">{quiz.description}</p>
                )}
              </div>
            </div>
            
            {/* Timer */}
            {timeRemaining !== null && (
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{quiz?.attempts_remaining} attempts remaining</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {currentQuestionIndex + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {currentQuestion.question_text}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <BookOpen className="h-4 w-4" />
                      <span>{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span className="capitalize">{currentQuestion.question_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="ml-11 space-y-3">
                  {currentQuestion.question_type === 'short_answer' ? (
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  ) : (
                    Object.entries(currentQuestion.options).map(([key, value]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                      >
                        <input
                          type={currentQuestion.question_type === 'multiple_choice' ? 'radio' : 'radio'}
                          name={`question-${currentQuestion.id}`}
                          value={key}
                          checked={answers[currentQuestion.id] === key}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1 text-gray-700">{value as string}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {submitting ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Navigation Dots */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600'
                    : answers[questions[index].id]
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
                title={`Question ${index + 1}${answers[questions[index].id] ? ' (answered)' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakingInterface;
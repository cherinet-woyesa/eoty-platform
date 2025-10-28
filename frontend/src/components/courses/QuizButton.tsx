import React, { useState, useEffect } from 'react';
import { Brain, Play, Award } from 'lucide-react';
import QuizInterface from './QuizInterface';
import { quizApi } from '../../services/api/quiz';

interface QuizButtonProps {
  lessonId: number;
  hasQuiz?: boolean;
  quizCompleted?: boolean;
  onQuizComplete?: (results: any) => void;
}

const QuizButton: React.FC<QuizButtonProps> = ({ 
  lessonId, 
  hasQuiz = true, 
  quizCompleted = false,
  onQuizComplete 
}) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [hasQuizData, setHasQuizData] = useState(hasQuiz);
  const [isQuizCompleted, setIsQuizCompleted] = useState(quizCompleted);

  useEffect(() => {
    checkQuizStatus();
  }, [lessonId]);

  const checkQuizStatus = async () => {
    try {
      const response = await quizApi.getLessonQuestions(lessonId);
      setHasQuizData(response.data.questions.length > 0);
      
      // Check if user has completed quiz
      const progressResponse = await quizApi.getLessonProgress(lessonId);
      setIsQuizCompleted(progressResponse.data.progress?.is_quiz_completed || false);
    } catch (error) {
      console.error('Failed to check quiz status:', error);
      setHasQuizData(false);
    }
  };

  const handleQuizComplete = (results: any) => {
    setShowQuiz(false);
    setIsQuizCompleted(true);
    onQuizComplete?.(results);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
  };

  if (!hasQuizData) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowQuiz(true)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          isQuizCompleted
            ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
        }`}
      >
        {isQuizCompleted ? (
          <>
            <Award className="h-4 w-4" />
            <span>Quiz Completed</span>
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            <span>Take Quiz</span>
          </>
        )}
      </button>

      {showQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <QuizInterface
              lessonId={lessonId}
              onQuizComplete={handleQuizComplete}
              onClose={handleCloseQuiz}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default QuizButton;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Play, Award } from 'lucide-react';
import QuizInterface from '@/components/shared/courses/QuizInterface';
import QuizButton from '@/components/shared/courses/QuizButton';

const QuizDemo: React.FC = () => {
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const handleQuizComplete = (results: any) => {
    setQuizResults(results);
    console.log('Quiz completed with results:', results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/courses" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz System Demo</h1>
          <p className="text-gray-600">
            Test the interactive quiz functionality with multiple choice, true/false, and short answer questions.
          </p>
        </div>

        {/* Demo Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Button Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              Quiz Integration
            </h2>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Click the quiz button below to start an interactive quiz for this lesson.
              </p>
              
              <div className="flex space-x-4">
                <QuizButton
                  lessonId={1} // Demo lesson ID
                  hasQuiz={true}
                  quizCompleted={quizResults !== null}
                  onQuizComplete={handleQuizComplete}
                />
                
                <button
                  onClick={() => setShowQuiz(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>Open Quiz Modal</span>
                </button>
              </div>

              {quizResults && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2" />
                    Quiz Results
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Score:</span>
                      <span className="ml-2 font-semibold">{Math.round(quizResults.scorePercentage)}%</span>
                    </div>
                    <div>
                      <span className="text-green-700">Correct:</span>
                      <span className="ml-2 font-semibold">{quizResults.correctAnswers}/{quizResults.totalQuestions}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Points:</span>
                      <span className="ml-2 font-semibold">{quizResults.totalPoints}/{quizResults.maxPoints}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quiz Features
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Multiple Question Types</h3>
                  <p className="text-sm text-gray-600">Multiple choice, true/false, and short answer questions</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Instant Feedback</h3>
                  <p className="text-sm text-gray-600">Immediate feedback on answers with explanations</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Progress Tracking</h3>
                  <p className="text-sm text-gray-600">Track completion and scores across sessions</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">4</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Timer Support</h3>
                  <p className="text-sm text-gray-600">Optional timer for timed quizzes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">5</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Responsive Design</h3>
                  <p className="text-sm text-gray-600">Works perfectly on all device sizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Modal */}
        {showQuiz && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <QuizInterface
                lessonId={1}
                onQuizComplete={handleQuizComplete}
                onClose={() => setShowQuiz(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizDemo;

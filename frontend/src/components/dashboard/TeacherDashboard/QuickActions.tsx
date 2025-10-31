import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Video, BookOpen, Users, Zap, BarChart, Plus, FileText, MessageCircle, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Added translation hook

const QuickActions: React.FC = () => {
  const { t } = useTranslation(); // Added translation hook

  const actions = [
    {
      icon: <Video className="h-5 w-5" />,
      label: t('dashboard.teacher.record_new_video'), // Updated to use translation
      description: t('courses.create_new_lesson', 'Create a new lesson'), // Updated to use translation
      href: '/record',
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: t('dashboard.teacher.create_course'), // Updated to use translation
      description: t('courses.start_new_course', 'Start a new course'), // Updated to use translation
      href: '/courses/new',
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: t('common.manage_students'), // Updated to use translation
      description: t('dashboard.teacher.view_student_progress', 'View student progress'), // Updated to use translation
      href: '/students',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: <BarChart className="h-5 w-5" />,
      label: t('dashboard.teacher.view_analytics'), // Updated to use translation
      description: t('dashboard.teacher.view_course_analytics', 'View course analytics'), // Updated to use translation
      href: '/analytics',
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: t('common.resources'), // Updated to use translation
      description: t('courses.upload_materials', 'Upload materials'), // Updated to use translation
      href: '/resources',
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      label: t('common.discussions'), // Updated to use translation
      description: t('courses.answer_questions', 'Answer questions'), // Updated to use translation
      href: '/forums',
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-50'
    }
  ];

  const handleActionClick = useCallback((action: typeof actions[0]) => {
    // Analytics tracking could be added here
    console.log(`Quick action clicked: ${action.label}`);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
        {t('dashboard.teacher.quick_actions')} {/* Updated to use translation */}
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            onClick={() => handleActionClick(action)}
            className={`flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200 group ${action.bgColor} hover:scale-105`}
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mb-3`}>
              <div className="text-white">
                {action.icon}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 text-sm mb-1 group-hover:text-gray-700">
                {action.label}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-gray-600">
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">8</div>
            <div className="text-xs text-gray-500">{t('dashboard.teacher.total_courses')}</div> {/* Updated to use translation */}
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">247</div>
            <div className="text-xs text-gray-500">{t('dashboard.teacher.active_students')}</div> {/* Updated to use translation */}
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">4.8</div>
            <div className="text-xs text-gray-500">{t('dashboard.teacher.average_rating', 'Rating')}</div> {/* Updated to use translation */}
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">156</div>
            <div className="text-xs text-gray-500">{t('dashboard.teacher.total_lessons')}</div> {/* Updated to use translation */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickActions);
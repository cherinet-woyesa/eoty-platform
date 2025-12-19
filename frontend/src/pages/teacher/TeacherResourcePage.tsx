import React from 'react';
import { useTranslation } from 'react-i18next';
import TeacherResourceManager from './components/TeacherResourceManager';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const TeacherResourcePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('teacher.resources_title', 'Resource Management')}
          </h1>
          <p className="text-gray-500">
            {t('teacher.resources_subtitle', 'Upload and manage your teaching resources')}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <TeacherResourceManager />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TeacherResourcePage;

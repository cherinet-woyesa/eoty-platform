
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/services/api/apiClient';
import ProgressTrackedVideoPlayer from '@/components/shared/courses/ProgressTrackedVideoPlayer';
import LessonResourcesDisplay from '@/components/shared/resources/LessonResourcesDisplay';

const LessonView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/api/courses/lessons/${lessonId}`);
        if (res.data.success) {
          setLesson(res.data.data.lesson);
        } else {
          setError(res.data.message || 'Failed to load lesson');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };
    if (lessonId) fetchLesson();
  }, [lessonId]);

  if (loading) {
    return <div className="p-8 text-center text-lg text-gray-500">Loading lesson...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  if (!lesson) {
    return <div className="p-8 text-center text-gray-500">Lesson not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>
      <ProgressTrackedVideoPlayer lesson={lesson} autoPlay />
      <div className="mt-8">
        <LessonResourcesDisplay lessonId={parseInt(lesson.id)} canManage={lesson.canManageResources} />
      </div>
    </div>
  );
};

export default LessonView;

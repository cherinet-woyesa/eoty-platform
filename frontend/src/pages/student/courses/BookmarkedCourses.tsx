import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { brandColors } from '@/theme/brand';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface BookmarkedCourse {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  category: string;
  progress: number;
  lesson_count: number;
}

const BookmarkedCourses: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<BookmarkedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  const loadBookmarkedCourses = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/courses/bookmarked');
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load bookmarked courses:', err);
      setError(t('student_courses.load_bookmarks_fail'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    loadBookmarkedCourses();
  }, [loadBookmarkedCourses]);

  const handleRemoveBookmark = async (courseId: number) => {
    try {
      setRemoving(courseId);
      toast.promise(apiClient.post(`/courses/${courseId}/bookmark`), {
        loading: t('student_courses.removing_bookmark_toast'),
        success: () => {
          setCourses(courses.filter(course => course.id !== courseId));
          return t('student_courses.remove_bookmark_success_toast');
        },
        error: t('student_courses.remove_bookmark_fail_toast'),
      });
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" aria-label={t('student_courses.loading_bookmarks')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-20 px-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <BookOpen className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
        <h3 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          {t('student_courses.no_bookmarked_courses')}
        </h3>
        <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
          {t('student_courses.bookmark_courses_prompt')}
        </p>
        <div className="mt-6">
          <Button asChild style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})`, color: '#fff', borderColor: 'transparent' }}>
            <Link to="/member/all-courses?tab=browse">{t('student_courses.browse_courses_btn')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((course) => (
        <div key={course.id} className="group relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-lg dark:border-gray-700">
          <Link to={`/member/courses/${course.id}`} className="block">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {course.cover_image ? (
                <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
          </Link>
          <div className="p-4 flex flex-col flex-grow">
            <div className="flex-grow">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{course.category}</p>
              <h3 className="text-lg font-semibold mt-1 mb-2 leading-tight">
                <Link to={`/member/courses/${course.id}`} className="hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  {course.title}
                </Link>
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('student_courses.lesson_count', { count: course.lesson_count })}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive-outline" size="sm" disabled={removing === course.id}>
                      {removing === course.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('student_courses.remove_bookmark_btn')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('student_courses.remove_bookmark_confirm_title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('student_courses.remove_bookmark_confirm_desc')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('student_courses.cancel_btn')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveBookmark(course.id)}>
                        {t('student_courses.confirm_remove_btn')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookmarkedCourses;

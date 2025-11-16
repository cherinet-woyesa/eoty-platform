import React, { useState } from 'react';
import type { Course } from '@/types/courses';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { apiClient } from '@/services/api';

interface CoursePublisherProps {
  course: Course;
  onPublishSuccess?: (updatedCourse: Course) => void;
}

type PublishingStatus = 'draft' | 'published' | 'scheduled';

interface ValidationError {
  field: string;
  message: string;
}

export const CoursePublisher: React.FC<CoursePublisherProps> = ({
  course,
  onPublishSuccess
}) => {
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [localCourse, setLocalCourse] = useState(course);

  // Update local course when prop changes
  React.useEffect(() => {
    setLocalCourse(course);
  }, [course]);

  // Determine current publishing status
  const getPublishingStatus = (): PublishingStatus => {
    if (localCourse.scheduled_publish_at && !localCourse.is_published) {
      return 'scheduled';
    }
    return localCourse.is_published ? 'published' : 'draft';
  };

  const status = getPublishingStatus();

  // Validate course before publishing
  const validateCourse = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!localCourse.title || localCourse.title.trim() === '') {
      errors.push({ field: 'title', message: 'Course title is required' });
    }

    if (!localCourse.category) {
      errors.push({ field: 'category', message: 'Course category is required' });
    }

    if (!localCourse.lesson_count || localCourse.lesson_count === 0) {
      errors.push({ field: 'lessons', message: 'Course must have at least one lesson' });
    }

    return errors;
  };

  // Handle publish action
  const handlePublish = async () => {
    // Validate course
    const validationErrors = validateCourse();
    if (validationErrors.length > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Publish Course',
        message: validationErrors.map(e => e.message).join(', '),
        duration: 5000
      });
      return;
    }

    // Show confirmation dialog with course preview
    const confirmed = await confirm({
      title: 'Publish Course',
      message: `Are you sure you want to publish "${localCourse.title}"? This will make it visible to students.`,
      confirmLabel: 'Publish',
      cancelLabel: 'Cancel'
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post(`/courses/${localCourse.id}/publish`);
      
      if (response.data.success) {
        showNotification({
          type: 'success',
          title: 'Course Published',
          message: `"${localCourse.title}" is now live and visible to students`,
          duration: 5000
        });

        if (response.data.data.course) {
          setLocalCourse(response.data.data.course);
          if (onPublishSuccess) {
            onPublishSuccess(response.data.data.course);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to publish course';
      showNotification({
        type: 'error',
        title: 'Publishing Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unpublish action
  const handleUnpublish = async () => {
    const confirmed = await confirm({
      title: 'Unpublish Course',
      message: `Are you sure you want to unpublish "${localCourse.title}"? Students will no longer be able to access it.`,
      confirmLabel: 'Unpublish',
      cancelLabel: 'Cancel'
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post(`/courses/${localCourse.id}/unpublish`);
      
      if (response.data.success) {
        showNotification({
          type: 'success',
          title: 'Course Unpublished',
          message: `"${localCourse.title}" is now hidden from students`,
          duration: 5000
        });

        if (response.data.data.course) {
          setLocalCourse(response.data.data.course);
          if (onPublishSuccess) {
            onPublishSuccess(response.data.data.course);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to unpublish course';
      showNotification({
        type: 'error',
        title: 'Unpublish Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle schedule publish action
  const handleSchedulePublish = async () => {
    if (!scheduledDate || !scheduledTime) {
      showNotification({
        type: 'error',
        title: 'Invalid Date',
        message: 'Please select both date and time',
        duration: 3000
      });
      return;
    }

    // Validate course
    const validationErrors = validateCourse();
    if (validationErrors.length > 0) {
      showNotification({
        type: 'error',
        title: 'Cannot Schedule Course',
        message: validationErrors.map(e => e.message).join(', '),
        duration: 5000
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Validate date is in the future
    if (scheduledDateTime <= new Date()) {
      showNotification({
        type: 'error',
        title: 'Invalid Date',
        message: 'Scheduled date must be in the future',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post(`/courses/${localCourse.id}/schedule-publish`, {
        scheduledDate: scheduledDateTime.toISOString()
      });
      
      if (response.data.success) {
        showNotification({
          type: 'success',
          title: 'Course Scheduled',
          message: `"${localCourse.title}" will be published on ${scheduledDateTime.toLocaleString()}`,
          duration: 5000
        });

        setShowScheduleDialog(false);
        setScheduledDate('');
        setScheduledTime('');

        if (response.data.data.course) {
          setLocalCourse(response.data.data.course);
          if (onPublishSuccess) {
            onPublishSuccess(response.data.data.course);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to schedule course';
      showNotification({
        type: 'error',
        title: 'Scheduling Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle visibility toggle
  const handleVisibilityToggle = async () => {
    const newVisibility = !localCourse.is_public;
    
    setIsLoading(true);
    try {
      const response = await apiClient.put(`/courses/${localCourse.id}`, {
        is_public: newVisibility
      });
      
      if (response.data.success) {
        showNotification({
          type: 'success',
          title: 'Visibility Updated',
          message: `Course is now ${newVisibility ? 'public' : 'private'}`,
          duration: 3000
        });

        if (response.data.data.course) {
          setLocalCourse(response.data.data.course);
          if (onPublishSuccess) {
            onPublishSuccess(response.data.data.course);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update visibility';
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge styling - Compact
  const getStatusBadge = () => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <span className="w-1.5 h-1.5 mr-1.5 bg-green-500 rounded-full"></span>
            Published
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 mr-1.5 bg-blue-500 rounded-full"></span>
            Scheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            <span className="w-1.5 h-1.5 mr-1.5 bg-gray-500 rounded-full"></span>
            Draft
          </span>
        );
    }
  };

  // Get minimum date for scheduling (tomorrow)
  const getMinScheduleDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Publishing Status</h3>
          {getStatusBadge()}
        </div>
        {status === 'published' ? (
          <button
            onClick={handleUnpublish}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-200"
          >
            {isLoading ? 'Unpublishing...' : 'Unpublish'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowScheduleDialog(true)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200"
            >
              Schedule
            </button>
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        )}
      </div>
      
      <div className="p-4">

        {/* Scheduled publish info */}
        {status === 'scheduled' && localCourse.scheduled_publish_at && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Scheduled: <span className="font-medium">{new Date(localCourse.scheduled_publish_at).toLocaleString()}</span>
              </p>
            </div>
          </div>
        )}

        {/* Validation warnings */}
        {status === 'draft' && validateCourse().length > 0 && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-yellow-900 mb-1">Course Not Ready</p>
                <ul className="text-xs text-yellow-700 space-y-0.5">
                  {validateCourse().map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Schedule dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Publishing</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={getMinScheduleDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {scheduledDate && scheduledTime && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      Course will be published on{' '}
                      <span className="font-medium">
                        {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    setScheduledDate('');
                    setScheduledTime('');
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedulePublish}
                  disabled={isLoading || !scheduledDate || !scheduledTime}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePublisher;

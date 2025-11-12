import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  Loader2
} from 'lucide-react';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { useNotification } from '@/context/NotificationContext';
import { coursesApi } from '@/services/api';
import type { Course } from '@/types/courses';

interface BulkActionsProps {
  selectedCourses: number[];
  courses: Course[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

interface BulkOperationResult {
  action: string;
  totalRequested: number;
  successCount: number;
  failedCount: number;
  successfulCourseIds: number[];
  failed: Array<{ courseId: number; reason: string }>;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCourses,
  courses,
  onActionComplete,
  onClearSelection
}) => {
  const { confirm } = useConfirmDialog();
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const selectedCoursesData = courses.filter(c => selectedCourses.includes(c.id));

  const handleBulkAction = async (action: string) => {
    try {
      setIsProcessing(true);
      setShowProgress(true);
      setProgress({ current: 0, total: selectedCourses.length });

      const response = await coursesApi.bulkAction(action, selectedCourses);

      setShowProgress(false);

      if (response.success) {
        const result: BulkOperationResult = response.data;
        
        // Show success notification with summary
        showNotification({
          type: 'success',
          title: `Bulk ${action} completed`,
          message: `Successfully processed ${result.successCount} of ${result.totalRequested} courses`,
          duration: 5000
        });

        // Show failures if any
        if (result.failedCount > 0) {
          showNotification({
            type: 'warning',
            title: `${result.failedCount} courses failed`,
            message: result.failed.map(f => `Course ${f.courseId}: ${f.reason}`).join(', '),
            duration: 8000
          });
        }

        onActionComplete();
        onClearSelection();
      }
    } catch (error: any) {
      console.error('Bulk action error:', error);
      showNotification({
        type: 'error',
        title: 'Bulk action failed',
        message: error.response?.data?.message || 'Failed to perform bulk action',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      setShowProgress(false);
    }
  };

  const handlePublish = async () => {
    // Check which courses can be published
    const coursesWithoutLessons = selectedCoursesData.filter(c => (c.lesson_count || 0) === 0);
    
    let message = `Are you sure you want to publish ${selectedCourses.length} course(s)?`;
    
    if (coursesWithoutLessons.length > 0) {
      message += `\n\nWarning: ${coursesWithoutLessons.length} course(s) have no lessons and will not be published:\n`;
      message += coursesWithoutLessons.map(c => `• ${c.title}`).join('\n');
    }

    const confirmed = await confirm({
      title: 'Publish Courses',
      message,
      confirmLabel: 'Publish',
      cancelLabel: 'Cancel',
      variant: 'default'
    });

    if (confirmed) {
      await handleBulkAction('publish');
    }
  };

  const handleUnpublish = async () => {
    const publishedCourses = selectedCoursesData.filter(c => c.is_published);
    
    if (publishedCourses.length === 0) {
      showNotification({
        type: 'info',
        title: 'No published courses',
        message: 'None of the selected courses are currently published',
        duration: 3000
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Unpublish Courses',
      message: `Are you sure you want to unpublish ${publishedCourses.length} course(s)? Students will no longer be able to access them.`,
      confirmLabel: 'Unpublish',
      cancelLabel: 'Cancel',
      variant: 'default'
    });

    if (confirmed) {
      await handleBulkAction('unpublish');
    }
  };

  const handleDelete = async () => {
    // Calculate impact
    const totalLessons = selectedCoursesData.reduce((sum, c) => sum + (c.lesson_count || 0), 0);
    const totalStudents = selectedCoursesData.reduce((sum, c) => sum + (c.student_count || 0), 0);

    const impactMessage = `
This will permanently delete ${selectedCourses.length} course(s) and cannot be undone.

Impact:
• ${totalLessons} lesson(s) will be deleted
• ${totalStudents} student(s) will lose access

Courses to be deleted:
${selectedCoursesData.map(c => `• ${c.title} (${c.lesson_count || 0} lessons, ${c.student_count || 0} students)`).join('\n')}
    `.trim();

    const confirmed = await confirm({
      title: 'Delete Courses',
      message: impactMessage,
      confirmLabel: 'Delete Permanently',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      await handleBulkAction('delete');
    }
  };

  const handleArchive = async () => {
    const confirmed = await confirm({
      title: 'Archive Courses',
      message: `Are you sure you want to archive ${selectedCourses.length} course(s)? Archived courses will be hidden from the main list but can be restored later.`,
      confirmLabel: 'Archive',
      cancelLabel: 'Cancel',
      variant: 'default'
    });

    if (confirmed) {
      await handleBulkAction('archive');
    }
  };

  const handleUnarchive = async () => {
    const confirmed = await confirm({
      title: 'Unarchive Courses',
      message: `Are you sure you want to unarchive ${selectedCourses.length} course(s)? They will be restored to the main course list.`,
      confirmLabel: 'Unarchive',
      cancelLabel: 'Cancel',
      variant: 'default'
    });

    if (confirmed) {
      await handleBulkAction('unarchive');
    }
  };

  if (selectedCourses.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 animate-slide-up">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            {/* Selection Info */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePublish}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Publish selected courses"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </button>

              <button
                onClick={handleUnpublish}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Unpublish selected courses"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Unpublish
              </button>

              <button
                onClick={handleArchive}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Archive selected courses"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </button>

              <button
                onClick={handleUnarchive}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Unarchive selected courses"
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive
              </button>

              <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete selected courses"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900">Processing...</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please wait while we process your request. This may take a moment.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {progress.current} of {progress.total} courses processed
            </p>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 300ms ease-out;
        }
      `}</style>
    </>
  );
};

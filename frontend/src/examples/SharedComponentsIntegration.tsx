/**
 * Example showing how to integrate all shared components in a real feature
 * This demonstrates a typical teacher course management page
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../context/NotificationContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { DataTable, type ColumnDef, ErrorBoundary, LoadingButton } from '../components/shared';
import { useApiError } from '../hooks/useApiError';

interface Course {
  id: number;
  title: string;
  students: number;
  status: 'draft' | 'published';
  created_at: string;
}

// Mock API functions (replace with real API calls)
const coursesApi = {
  getCourses: async (): Promise<Course[]> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return [
      { id: 1, title: 'Introduction to Faith', students: 45, status: 'published', created_at: '2024-01-15' },
      { id: 2, title: 'Biblical History', students: 32, status: 'published', created_at: '2024-02-01' },
      { id: 3, title: 'Spiritual Growth', students: 0, status: 'draft', created_at: '2024-03-10' },
    ];
  },
  
  deleteCourse: async (id: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Simulate API call
  },
  
  publishCourse: async (id: number): Promise<Course> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Simulate API call
    return { id, title: 'Updated Course', students: 0, status: 'published', created_at: '2024-03-10' };
  },
};

export const SharedComponentsIntegration: React.FC = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const { handleError } = useApiError();

  // Fetch courses with React Query
  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.getCourses,
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: coursesApi.deleteCourse,
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['courses'] });
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(['courses']);
      
      // Optimistically remove course
      queryClient.setQueryData(['courses'], (old: Course[] = []) => {
        return old.filter((course) => course.id !== courseId);
      });
      
      return { previousCourses };
    },
    onError: (err, courseId, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['courses'], context.previousCourses);
      handleError(err, 'Failed to delete course');
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        title: 'Course Deleted',
        message: 'The course has been deleted successfully.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: coursesApi.publishCourse,
    onSuccess: () => {
      showNotification({
        type: 'success',
        title: 'Course Published',
        message: 'Your course is now live and visible to students.',
      });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => {
      handleError(err, 'Failed to publish course');
    },
  });

  // Handle delete with confirmation
  const handleDelete = async (course: Course) => {
    const confirmed = await confirm({
      title: 'Delete Course',
      message: `Are you sure you want to delete "${course.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      deleteMutation.mutate(course.id);
    }
  };

  // Handle publish
  const handlePublish = async (course: Course) => {
    if (course.status === 'published') {
      showNotification({
        type: 'info',
        title: 'Already Published',
        message: 'This course is already published.',
      });
      return;
    }

    publishMutation.mutate(course.id);
  };

  // Define table columns
  const columns: ColumnDef<Course>[] = [
    {
      key: 'title',
      header: 'Course Title',
      accessor: (row) => row.title,
      sortable: true,
      filterable: true,
    },
    {
      key: 'students',
      header: 'Students',
      accessor: (row) => row.students,
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === 'published'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status === 'published' ? 'Published' : 'Draft'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <LoadingButton
            loading={publishMutation.isPending}
            onClick={() => handlePublish(row)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={row.status === 'published'}
          >
            Publish
          </LoadingButton>
          <LoadingButton
            loading={deleteMutation.isPending}
            onClick={() => handleDelete(row)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </LoadingButton>
        </div>
      ),
    },
  ];

  // Handle query error
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Courses</h3>
          <p className="text-red-600 text-sm">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
          <p className="text-gray-600">Manage your courses and track student enrollment</p>
        </div>

        <DataTable
          data={courses}
          columns={columns}
          loading={isLoading}
          pagination={{
            page: 1,
            pageSize: 10,
            totalItems: courses.length,
          }}
          emptyMessage="No courses found. Create your first course to get started!"
        />
      </div>
    </ErrorBoundary>
  );
};

# Shared UI Components and Infrastructure

This directory contains reusable UI components and infrastructure for the EOTY Learning Platform teacher interface.

## Components

### 1. NotificationSystem
Toast notifications for success, error, warning, and info messages.

**Usage:**
```tsx
import { useNotification } from '../../context/NotificationContext';

const MyComponent = () => {
  const { showNotification } = useNotification();

  const handleSave = async () => {
    try {
      await saveData();
      showNotification({
        type: 'success',
        title: 'Saved',
        message: 'Your changes have been saved successfully.',
        duration: 5000,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save changes.',
        duration: 5000,
        actions: [
          { label: 'Retry', onClick: handleSave }
        ],
      });
    }
  };
};
```

### 2. ConfirmDialog
Modal dialog for confirming destructive actions.

**Usage:**
```tsx
import { useConfirmDialog } from '../../context/ConfirmDialogContext';

const MyComponent = () => {
  const { confirm } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Course',
      message: 'Are you sure you want to delete this course? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      await deleteCourse();
    }
  };
};
```

### 3. DataTable
Reusable table component with sorting, filtering, and pagination.

**Usage:**
```tsx
import { DataTable, type ColumnDef } from '../shared';

interface Course {
  id: number;
  title: string;
  students: number;
}

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
];

const MyComponent = () => {
  return (
    <DataTable
      data={courses}
      columns={columns}
      loading={isLoading}
      pagination={{
        page: 1,
        pageSize: 20,
        totalItems: 100,
      }}
      onPageChange={setPage}
      onRowClick={(course) => navigate(`/courses/${course.id}`)}
    />
  );
};
```

### 4. Loading States
Various loading indicators and skeletons.

**Usage:**
```tsx
import {
  Spinner,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  LoadingButton,
  LoadingOverlay,
} from '../shared';

// Spinner
<Spinner size="md" />

// Skeleton
<Skeleton width="100%" height="1rem" />

// Card Skeleton
<CardSkeleton />

// Table Skeleton
<TableSkeleton rows={5} columns={4} />

// Loading Button
<LoadingButton loading={isLoading} onClick={handleClick}>
  Save
</LoadingButton>

// Loading Overlay
<LoadingOverlay loading={isLoading}>
  <YourContent />
</LoadingOverlay>
```

### 5. ErrorBoundary
Catches and handles React component errors gracefully.

**Usage:**
```tsx
import { ErrorBoundary } from '../shared';

const MyComponent = () => {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
};
```

## React Query Setup

React Query is configured for data fetching, caching, and optimistic updates.

**Usage:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../../services/api';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['courses'],
  queryFn: coursesApi.getCourses,
});

// Mutations with optimistic updates
const queryClient = useQueryClient();

const updateMutation = useMutation({
  mutationFn: coursesApi.updateCourse,
  onMutate: async (updatedCourse) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['courses'] });
    
    // Snapshot previous value
    const previousCourses = queryClient.getQueryData(['courses']);
    
    // Optimistically update
    queryClient.setQueryData(['courses'], (old: any) => {
      return old.map((course: any) => 
        course.id === updatedCourse.id ? updatedCourse : course
      );
    });
    
    return { previousCourses };
  },
  onError: (err, updatedCourse, context: any) => {
    // Rollback on error
    queryClient.setQueryData(['courses'], context.previousCourses);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  },
});
```

## API Error Handling

Centralized error handling with user-friendly messages.

**Usage:**
```tsx
import { useApiError } from '../../hooks/useApiError';

const MyComponent = () => {
  const { handleError } = useApiError();

  const handleSave = async () => {
    try {
      await saveData();
    } catch (error) {
      handleError(error, 'Failed to save course');
    }
  };
};
```

## Theme Configuration

Consistent styling variables are available in `src/styles/theme.ts`.

**Usage:**
```tsx
import { theme } from '../../styles/theme';

// Use in inline styles
<div style={{ color: theme.colors.primary[600] }}>

// Or use Tailwind classes
<div className="text-blue-600 bg-blue-50">
```

## Setup Instructions

1. **Wrap your app with providers:**

```tsx
// src/App.tsx or src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import { NotificationSystem } from './components/shared';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ConfirmDialogProvider>
          <YourApp />
          <NotificationSystem />
          <ReactQueryDevtools initialIsOpen={false} />
        </ConfirmDialogProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
```

2. **Import and use components as needed**

3. **See `SharedComponentsDemo.tsx` for live examples**

## Best Practices

1. **Always use ErrorBoundary** around major sections of your app
2. **Show loading states** for all async operations
3. **Use notifications** for user feedback on actions
4. **Confirm destructive actions** with ConfirmDialog
5. **Handle errors gracefully** with the API error handler
6. **Use React Query** for all server state management
7. **Implement optimistic updates** for better UX
8. **Keep components accessible** with proper ARIA labels

## Testing

See `SharedComponentsDemo.tsx` for a comprehensive demo of all components.

To view the demo, import and render it in your app:

```tsx
import { SharedComponentsDemo } from './components/shared/SharedComponentsDemo';

// In your routes or component
<SharedComponentsDemo />
```

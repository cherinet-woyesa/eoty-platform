/**
 * Demo component showing how to use all shared UI components
 * This file serves as documentation and can be used for testing
 */

import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { DataTable, type ColumnDef } from './DataTable';
import {
  Spinner,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  LoadingButton,
  LoadingOverlay,
} from './LoadingStates';

interface SampleData {
  id: number;
  name: string;
  email: string;
  status: string;
}

export const SharedComponentsDemo: React.FC = () => {
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Sample data for DataTable
  const sampleData: SampleData[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ];

  const columns: ColumnDef<SampleData>[] = [
    {
      key: 'name',
      header: 'Name',
      accessor: (row) => row.name,
      sortable: true,
      filterable: true,
    },
    {
      key: 'email',
      header: 'Email',
      accessor: (row) => row.email,
      sortable: true,
      filterable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status}
        </span>
      ),
      sortable: true,
    },
  ];

  // Notification examples
  const showSuccessNotification = () => {
    showNotification({
      type: 'success',
      title: 'Success!',
      message: 'Your changes have been saved successfully.',
      duration: 5000,
    });
  };

  const showErrorNotification = () => {
    showNotification({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong. Please try again.',
      duration: 5000,
      actions: [
        {
          label: 'Retry',
          onClick: () => console.log('Retry clicked'),
        },
      ],
    });
  };

  const showWarningNotification = () => {
    showNotification({
      type: 'warning',
      title: 'Warning',
      message: 'This action cannot be undone.',
      duration: 5000,
    });
  };

  const showInfoNotification = () => {
    showNotification({
      type: 'info',
      title: 'Info',
      message: 'New features are available. Check them out!',
      duration: 5000,
    });
  };

  // Confirm dialog example
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      showNotification({
        type: 'success',
        title: 'Deleted',
        message: 'Item has been deleted successfully.',
      });
    }
  };

  // Loading button example
  const handleButtonClick = async () => {
    setButtonLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setButtonLoading(false);
    showSuccessNotification();
  };

  // Loading overlay example
  const toggleLoading = () => {
    setLoading(!loading);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shared Components Demo</h1>

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={showSuccessNotification}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Show Success
          </button>
          <button
            onClick={showErrorNotification}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Show Error
          </button>
          <button
            onClick={showWarningNotification}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Show Warning
          </button>
          <button
            onClick={showInfoNotification}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show Info
          </button>
        </div>
      </section>

      {/* Confirm Dialog */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Confirm Dialog</h2>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Item
        </button>
      </section>

      {/* Loading States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Loading States</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Spinners</h3>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Skeletons</h3>
            <div className="space-y-2">
              <Skeleton width="100%" height="1rem" />
              <Skeleton width="80%" height="1rem" />
              <Skeleton width="60%" height="1rem" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Card Skeleton</h3>
            <CardSkeleton />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Loading Button</h3>
            <LoadingButton
              loading={buttonLoading}
              onClick={handleButtonClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Click Me
            </LoadingButton>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Loading Overlay</h3>
            <button
              onClick={toggleLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
            >
              Toggle Loading
            </button>
            <LoadingOverlay loading={loading}>
              <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-2">Content Area</h4>
                <p className="text-gray-600">
                  This content will be overlaid with a loading indicator when loading is true.
                </p>
              </div>
            </LoadingOverlay>
          </div>
        </div>
      </section>

      {/* DataTable */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">DataTable</h2>
        <DataTable
          data={sampleData}
          columns={columns}
          onRowClick={(row) => console.log('Row clicked:', row)}
          pagination={{
            page: 1,
            pageSize: 10,
            totalItems: sampleData.length,
          }}
        />
      </section>

      {/* Table Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Table Skeleton</h2>
        <TableSkeleton rows={5} columns={3} />
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, X } from 'lucide-react';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import { useNotification } from '@/context/NotificationContext';
import { LoadingButton } from '@/components/shared/LoadingStates';
import type { BulkActionResult } from '@/types/systemConfig';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onActivate?: () => Promise<BulkActionResult>;
  onDeactivate?: () => Promise<BulkActionResult>;
  onDelete?: () => Promise<BulkActionResult>;
  entityName: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onActivate,
  onDeactivate,
  onDelete,
  entityName,
}) => {
  const { confirm } = useConfirmDialog();
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleAction = async (
    action: () => Promise<BulkActionResult>,
    actionName: string,
    confirmMessage: string
  ) => {
    const confirmed = await confirm({
      title: `${actionName} ${selectedCount} ${entityName}${selectedCount > 1 ? 's' : ''}?`,
      message: confirmMessage,
      confirmLabel: actionName,
      variant: actionName === 'Delete' ? 'danger' : 'default',
    });

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const result = await action();

      // Show summary
      if (result.successful > 0 && result.failed === 0) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: `Successfully ${actionName.toLowerCase()}d ${result.successful} ${entityName}${result.successful > 1 ? 's' : ''}`,
        });
      } else if (result.successful > 0 && result.failed > 0) {
        showNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `${actionName}d ${result.successful} ${entityName}${result.successful > 1 ? 's' : ''}, ${result.failed} failed`,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: `Failed to ${actionName.toLowerCase()} ${entityName}s`,
        });
      }

      // Show detailed errors if any
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map(e => `ID ${e.id}: ${e.error}`).join('\n');
        console.error('Bulk action errors:', errorMessages);
      }

      onClearSelection();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Failed to ${actionName.toLowerCase()} ${entityName}s`;
      showNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <div className="bg-[#27AE60]/10 text-[#27AE60] px-3 py-1 rounded-full text-sm font-medium">
              {selectedCount} selected
            </div>
            <button
              onClick={onClearSelection}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onActivate && (
              <LoadingButton
                onClick={() =>
                  handleAction(
                    onActivate,
                    'Activate',
                    `This will activate ${selectedCount} ${entityName}${selectedCount > 1 ? 's' : ''}.`
                  )
                }
                loading={isProcessing}
                className="px-4 py-2 bg-[#27AE60] hover:bg-[#219150] text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Activate
              </LoadingButton>
            )}

            {onDeactivate && (
              <LoadingButton
                onClick={() =>
                  handleAction(
                    onDeactivate,
                    'Deactivate',
                    `This will deactivate ${selectedCount} ${entityName}${selectedCount > 1 ? 's' : ''}.`
                  )
                }
                loading={isProcessing}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <EyeOff className="h-4 w-4" />
                Deactivate
              </LoadingButton>
            )}

            {onDelete && (
              <LoadingButton
                onClick={() =>
                  handleAction(
                    onDelete,
                    'Delete',
                    `This will permanently delete ${selectedCount} ${entityName}${selectedCount > 1 ? 's' : ''}. This action cannot be undone.`
                  )
                }
                loading={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </LoadingButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { assignmentsApi } from '@/services/api/assignments';
import { useNotification } from '@/context/NotificationContext';

interface AssignmentSubmissionModalProps {
  assignmentId: number;
  assignmentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customSubmitFn?: (id: number, payload: { content?: string; file?: File }) => Promise<any>;
}

const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  assignmentId,
  assignmentTitle,
  isOpen,
  onClose,
  onSuccess,
  customSubmitFn
}) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) {
      setError(t('assignments_page.submission_empty_error') || 'Please provide text content or a file.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: any = { content };
      if (file) payload.file = file;

      if (customSubmitFn) {
        await customSubmitFn(assignmentId, payload);
      } else {
        await assignmentsApi.submit(assignmentId, payload);
      }

      showNotification({
        type: 'success',
        title: t('assignments_page.submit_success_title'),
        message: t('assignments_page.submit_success')
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit assignment:', err);
      const message = err?.response?.data?.message || err?.message || t('assignments_page.submit_error');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('assignments_page.submit_assignment')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 font-medium">
              {t('assignments_page.submitting_for')}: <span className="font-bold">{assignmentTitle}</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('assignments_page.submission_text_label') || 'Text Submission'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('assignments_page.submission_placeholder') || 'Type your submission here...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('assignments_page.submission_file_label') || 'File Attachment'}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium text-sm truncate max-w-[200px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="p-1 hover:bg-emerald-100 rounded-full z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">{t('assignments_page.upload_prompt') || 'Click to upload a file'}</span>
                  <span className="text-xs text-gray-400">PDF, DOCX, ZIP up to 10MB</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('assignments_page.submitting') || 'Submitting...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t('assignments_page.submit_btn') || 'Submit Assignment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentSubmissionModal;

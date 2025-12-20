import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Award, FileText, Check, Clock, Upload } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import teacherApi, { type TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { brandColors } from '@/theme/brand';

type TeacherProfileData = TeacherProfileType;

interface VerificationViewProps {
  profile: TeacherProfileData;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onBack: () => void;
}

const VerificationView: React.FC<VerificationViewProps> = ({ profile, onUpdate }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  // Fetch uploaded documents to get URLs
  const { data: uploadedDocuments } = useQuery({
    queryKey: ['teacher-documents'],
    queryFn: async () => {
      try {
        const res = await teacherApi.getDocuments();
        return res.data?.documents || [];
      } catch (e) {
        console.error('Failed to fetch documents', e);
        return [];
      }
    }
  });

  // Document upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      try {
        // Upload the document to the backend
        const response = await teacherApi.uploadDocument(file, key);
        
        if (!response.data?.documentUrl) {
          throw new Error('Upload failed: No document URL returned');
        }

        // Update the profile verification status
        const currentDocs = profile.verification_docs || {};
        return await onUpdate({
          verification_docs: {
            ...currentDocs,
            [key]: 'PENDING'
          }
        });
      } catch (error) {
        console.error('Document upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-documents'] }); // Refresh documents list
      showNotification({
        title: t('common.success', 'Success'),
        message: t('teacher_profile.document_upload_success', 'Document uploaded successfully. Status: Pending Review.'),
        type: 'success'
      });
      setActiveDoc(null);
    },
    onError: (error) => {
      console.error('Failed to upload document:', error);
      showNotification({
        title: t('common.error', 'Error'),
        message: t('teacher_profile.document_upload_failed', 'Failed to upload document. Please try again.'),
        type: 'error'
      });
    }
  });

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setActiveDoc(file ? key : null);
    setSelectedFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSaveUpload = (key: string) => {
    const file = selectedFiles[key];
    if (file) {
      uploadDocMutation.mutate({ key, file });
    }
  };

  const docs = [
    {
      key: 'national_id',
      title: 'National ID / Passport',
      description: 'Government-issued ID for identity verification.',
      icon: <User className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
    },
    {
      key: 'teaching_cert',
      title: 'Teaching Certification',
      description: 'Valid teaching license or degree certificate.',
      icon: <Award className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
    },
    {
      key: 'tax_form',
      title: 'Tax Residency Form',
      description: 'Proof of tax residency for payout compliance.',
      icon: <FileText className="h-6 w-6" style={{ color: brandColors.primaryHex }} />
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return t('teacher_documents.status.verified', 'Verified');
      case 'PENDING': return t('teacher_documents.status.pending', 'Pending Review');
      case 'REJECTED': return t('teacher_documents.status.rejected', 'Rejected');
      default: return t('teacher_documents.status.not_submitted', 'Not Submitted');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900">{t('teacher_documents.title', 'Verification Documents')}</h1>
          <p className="text-gray-600 mt-1 text-lg">{t('teacher_documents.subtitle', 'Upload required documents to verify your teacher status and unlock all platform features.')}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm font-semibold border border-gray-200" style={{ color: brandColors.primaryHex, backgroundColor: `${brandColors.primaryHex}10`, borderColor: `${brandColors.primaryHex}30` }}>
            {Object.values(profile.verification_docs || {}).filter(s => s === 'VERIFIED').length} / {docs.length} {t('teacher_documents.status.verified', 'Verified')}
          </span>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc) => {
          const status = profile.verification_docs?.[doc.key];
          const uploadedDoc = uploadedDocuments?.find((d: any) => d.document_type === doc.key);

          return (
            <div key={doc.key} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    {doc.icon}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t(`teacher_documents.doc_types.${doc.key}.title`, doc.title)}</h3>
                <p className="text-sm text-gray-600">{t(`teacher_documents.doc_types.${doc.key}.description`, doc.description)}</p>
                
                {/* View Link */}
                {uploadedDoc && (
                  <div className="mt-3">
                    <a 
                      href={uploadedDoc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: brandColors.primaryHex }}
                    >
                      <FileText className="h-3 w-3" />
                      {t('common.view', 'View Document')}
                    </a>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                {status === 'VERIFIED' ? (
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-2" />
                    {t('teacher_documents.verification_complete', 'Verification Complete')}
                  </div>
                ) : (
                  <div className="w-full flex items-center gap-3">
                    <label className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      {uploadDocMutation.isPending ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {status === 'PENDING'
                        ? t('teacher_documents.upload_new_btn', 'Upload New Version')
                        : t('teacher_documents.upload_btn', 'Upload Document')}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(doc.key, e)}
                        disabled={uploadDocMutation.isPending}
                      />
                    </label>
                    {selectedFiles[doc.key] && (
                      <button
                        onClick={() => handleSaveUpload(doc.key)}
                        disabled={uploadDocMutation.isPending}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-600"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        {t('common.save', 'Save')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationView;

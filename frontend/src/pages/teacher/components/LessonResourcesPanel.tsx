import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Link as LinkIcon } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import type { Resource } from '@/types/resources';
import { brandColors } from '@/theme/brand';
import AttachedResourcesList from './resources/AttachedResourcesList';
import Modal from '@/components/common/Modal';
import TeacherResourceManager from './TeacherResourceManager';

interface LessonResourcesPanelProps {
  lessonId: string;
}

const LessonResourcesPanel: React.FC<LessonResourcesPanelProps> = ({ lessonId }) => {
  const { t } = useTranslation();
  const [attachedResources, setAttachedResources] = useState<Resource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAttachedResources = async () => {
    if (!lessonId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/lessons/${lessonId}`);
      if (res.data?.success) {
        const data = res.data.data;
        if (data?.lesson?.resources) {
          setAttachedResources(data.lesson.resources);
        }
      }
    } catch (error) {
      console.error('Failed to load attached resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachedResources();
  }, [lessonId]);

  const handleDetachResource = async (resourceId: number) => {
    try {
      await apiClient.post('/resources/detach-from-lesson', { resourceId, lessonId: parseInt(lessonId) });
      await loadAttachedResources();
    } catch (error) {
      console.error('Failed to detach resource:', error);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-gray-400" />
            {t('teacher_content.resources.attached_title', 'Lesson Resources')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('teacher_content.resources.attached_desc', 'Manage files and materials for this lesson')}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md"
          style={{ backgroundColor: brandColors.primaryHex }}
        >
          <Plus className="h-4 w-4" />
          {t('teacher_content.resources.add_resource', 'Add Resource')}
        </button>
      </div>

      <div className="p-6">
        <AttachedResourcesList
          lessonId={lessonId}
          attachedResources={attachedResources}
          handleDetachResource={handleDetachResource}
          t={t as any}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('teacher_content.resources.add_modal_title', 'Add Resources to Lesson')}
        maxWidth="5xl"
      >
        <div className="h-[70vh]">
          <TeacherResourceManager 
            lessonId={lessonId} 
            hideAttachedList={true}
            onAttach={loadAttachedResources}
          />
        </div>
      </Modal>
    </div>
  );
};

export default LessonResourcesPanel;

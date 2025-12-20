import React from 'react';
import { 
  Star, CheckCircle, Play, RotateCcw, Scissors, 
  FileText, Loader, BookOpen, Upload, AlertCircle 
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string;
  category?: string;
}

interface LessonDetailsFormProps {
  t: (key: string, defaultVal?: string) => string;
  lessonId?: string;
  recordedVideo: string | null;
  selectedFile: File | null;
  recordingDuration: number;
  activeTab: 'record' | 'upload';
  handleReset: () => void;
  setShowEnhancedPreview: (show: boolean) => void;
  setShowTimelineEditor: (show: boolean) => void;
  selectedCourse: string;
  setSelectedCourse: (id: string) => void;
  uploading: boolean;
  isCreatingCourseLoading: boolean;
  courses: Course[];
  isCreatingCourse: boolean;
  setIsCreatingCourse: (isCreating: boolean) => void;
  newCourseTitle: string;
  setNewCourseTitle: (title: string) => void;
  handleCreateCourseInline: () => void;
  lessonTitle: string;
  setLessonTitle: (title: string) => void;
  lessonDescription: string;
  setLessonDescription: (desc: string) => void;
  handleUpload: () => void;
  uploadSuccess: boolean;
}

const LessonDetailsForm: React.FC<LessonDetailsFormProps> = ({
  t,
  lessonId,
  recordedVideo,
  selectedFile,
  recordingDuration,
  activeTab,
  handleReset,
  setShowEnhancedPreview,
  setShowTimelineEditor,
  selectedCourse,
  setSelectedCourse,
  uploading,
  isCreatingCourseLoading,
  courses,
  isCreatingCourse,
  setIsCreatingCourse,
  newCourseTitle,
  setNewCourseTitle,
  handleCreateCourseInline,
  lessonTitle,
  setLessonTitle,
  lessonDescription,
  setLessonDescription,
  handleUpload,
  uploadSuccess
}) => {
  return (
    <div className="p-6 border-t border-slate-200/50 bg-white/85 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-700">
            <Star className="h-5 w-5 text-[#FFD700]" />
            <span>
              {lessonId ? t('record_video.update_lesson', 'Update Lesson') : t('record_video.create_new_lesson', 'Create New Lesson')}
            </span>
          </h3>
          {/* Mode indicator */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${lessonId
              ? 'bg-[#2980B9]/10 text-[#2980B9] border border-[#2980B9]/20'
              : 'bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20'
            }`}>
            {lessonId ? `🎬 ${t('record_video.recording_mode', 'Recording Mode')}` : `📝 ${t('record_video.new_lesson_mode', 'New Lesson Mode')}`}
          </div>
        </div>
        <p className="text-sm text-slate-600 hidden sm:block">
          {lessonId
            ? 'This will replace the video for your existing lesson'
            : 'Create a new lesson with your recorded/uploaded video'
          }
        </p>
      </div>

      {/* Video Actions (Preview/Edit) - Only if video exists */}
      {(recordedVideo || selectedFile) && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Video Ready
            </h4>
            <p className="text-xs text-slate-500">
              {recordingDuration > 0 ? `Duration: ${Math.floor(recordingDuration)}s` : 'Ready to upload'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowEnhancedPreview(true);
                // Don't hide form, just show preview modal
              }}
              className="px-3 py-2 border border-slate-300/50 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm text-slate-700"
            >
              <Play className="h-4 w-4" />
              <span>Preview</span>
            </button>
            {activeTab === 'record' && (
              <>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200 flex items-center space-x-2 text-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Record Again</span>
                </button>
                <div className="relative group">
                  <button
                    onClick={() => {
                      setShowTimelineEditor(true);
                      // Don't hide form
                    }}
                    className="px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-all duration-200 flex items-center space-x-2 text-sm"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Edit Video</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    Trim your video to remove unwanted parts
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700">{t('record_video.select_course_required', 'Select Course (Required)')}</label>
          <div className="flex flex-col gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm"
              disabled={uploading || isCreatingCourseLoading}
            >
              <option value="">{t('record_video.choose_course', 'Choose a course...')}</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            {!isCreatingCourse && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCourse(true);
                  setNewCourseTitle('');
                }}
                className="inline-flex items-center text-xs text-sky-700 hover:text-sky-900 self-start px-2 py-1 rounded-md hover:bg-sky-50 transition-colors"
                disabled={uploading}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                {t('record_video.create_new_course_button', 'Create new course')}
              </button>
            )}
            {isCreatingCourse && (
              <div className="mt-1 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('record_video.new_course_title', 'New Course Title')}
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder={t('record_video.course_title_placeholder', 'e.g. Introduction to Faith')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-transparent"
                  disabled={isCreatingCourseLoading}
                />
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCreatingCourseLoading) {
                        setIsCreatingCourse(false);
                        setNewCourseTitle('');
                      }
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white"
                    disabled={isCreatingCourseLoading}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCourseInline}
                    className="px-3 py-1.5 text-xs rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 flex items-center"
                    disabled={isCreatingCourseLoading || !newCourseTitle.trim()}
                  >
                    {isCreatingCourseLoading ? (
                      <>
                        <Loader className="h-3.5 w-3.5 mr-1 animate-spin" />
                        {t('record_video.creating', 'Creating...')}
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-3.5 w-3.5 mr-1" />
                        {t('record_video.create_and_select', 'Create & Select')}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t('record_video.create_course_help_text', 'This will create a new course and select it automatically.')}
                </p>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700">{t('record_video.lesson_title_required', 'Lesson Title (Required)')}</label>
          <input
            type="text"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder={t('record_video.enter_lesson_title', 'Enter lesson title')}
            className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm"
            disabled={uploading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-slate-700">{t('record_video.description_optional', 'Description (Optional)')}</label>
          <textarea
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
            placeholder={t('record_video.brief_description', 'Brief description of the lesson')}
            rows={3}
            className="w-full p-3 border border-slate-300 rounded-xl bg-white/90 text-slate-700 focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent shadow-sm"
            disabled={uploading}
          />
        </div>
        <div className="flex space-x-3 pt-2">
          {(recordedVideo || selectedFile) && activeTab !== 'record' && (
            <button
              onClick={handleReset}
              disabled={uploading}
              className="px-4 py-3 border border-slate-300/50 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 text-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Upload New</span>
            </button>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || uploadSuccess || !selectedCourse || !lessonTitle.trim() || (!recordedVideo && !selectedFile)}
            className="flex-1 px-4 py-3 border border-transparent rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-md backdrop-blur-sm border border-emerald-500/40"
          >
            {uploading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Uploaded!</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{lessonId ? t('record_video.update_lesson', 'Update Lesson') : t('record_video.create_lesson', 'Create Lesson')}</span>
              </>
            )}
          </button>
        </div>

        {/* Warning if no video */}
        {(!recordedVideo && !selectedFile) && (
          <p className="text-xs text-center text-amber-600 mt-2 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('record_video.record_or_upload_required', 'Please record or upload a video first')}
          </p>
        )}
      </div>
    </div>
  );
};

export default LessonDetailsForm;

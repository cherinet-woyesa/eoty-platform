import React, { useState } from 'react';
import { LessonEditor } from './LessonEditor';
import type { Lesson } from '../../types/courses';

/**
 * Demo component showcasing the LessonEditor
 * 
 * This component demonstrates how to use the LessonEditor component
 * for editing lesson details, managing video content, and handling resources.
 */
const LessonEditorDemo: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('1');
  const [courseId] = useState<string>('1');

  const handleSave = (lesson: Lesson) => {
    console.log('Lesson saved:', lesson);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LessonEditor Component Demo
          </h1>
          <p className="text-gray-600">
            Comprehensive lesson editing with video management, subtitles, and resources
          </p>
        </div>

        {!isEditing ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Demo Controls
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Lesson ID
                </label>
                <input
                  type="text"
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter lesson ID"
                />
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                Open Lesson Editor
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Edit lesson title, description, order, and duration</li>
                <li>Upload and preview video files with progress indicator</li>
                <li>Replace or remove existing videos</li>
                <li>Generate and select video thumbnails from frames</li>
                <li>Real-time video processing status updates</li>
                <li>Upload subtitle/caption files (VTT, SRT)</li>
                <li>Manage downloadable resources with multiple types</li>
                <li>Form validation with inline error messages</li>
                <li>Loading states and success/error notifications</li>
              </ul>
            </div>
          </div>
        ) : (
          <LessonEditor
            lessonId={selectedLessonId}
            courseId={courseId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default LessonEditorDemo;

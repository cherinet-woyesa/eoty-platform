import React, { useState } from 'react';
import { CourseEditor } from './CourseEditor';
import { BookOpen, Code, CheckCircle } from 'lucide-react';

/**
 * Demo component showcasing the CourseEditor component
 * 
 * This demonstrates all the features of the CourseEditor:
 * - Comprehensive form with all course fields
 * - Real-time validation with inline error messages
 * - Auto-save to localStorage every 30 seconds
 * - Unsaved changes warning on navigation
 * - Cover image upload with preview
 * - Rich text editor for description
 * - Learning objectives management (add/remove/reorder)
 * - Prerequisites and estimated duration fields
 * - Integration with PUT /api/courses/:courseId endpoint
 * - Loading states and success/error notifications
 */
export const CourseEditorDemo: React.FC = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('1');
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CourseEditor Component Demo</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive course editing with validation, auto-save, and rich features
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Validation</h3>
                <p className="text-sm text-gray-600">Inline error messages with field-level validation</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Auto-save</h3>
                <p className="text-sm text-gray-600">Saves to localStorage every 30 seconds</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Unsaved Changes Warning</h3>
                <p className="text-sm text-gray-600">Prevents accidental navigation loss</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Cover Image Upload</h3>
                <p className="text-sm text-gray-600">With preview and validation</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Learning Objectives</h3>
                <p className="text-sm text-gray-600">Add, remove, and reorder objectives</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">API Integration</h3>
                <p className="text-sm text-gray-600">Full CRUD with optimistic updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <Code className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Usage Example</h2>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { CourseEditor } from './components/courses';

function EditCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  return (
    <CourseEditor
      courseId={courseId}
      onSave={(course) => {
        console.log('Course saved:', course);
        navigate('/courses');
      }}
      onCancel={() => navigate('/courses')}
    />
  );
}`}
          </pre>
        </div>

        {/* Interactive Demo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive Demo</h2>
          
          {!showEditor ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a course to edit:
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Introduction to Orthodox Christianity</option>
                  <option value="2">Church History and Tradition</option>
                  <option value="3">Biblical Studies</option>
                </select>
              </div>
              <button
                onClick={() => setShowEditor(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Open Course Editor
              </button>
            </div>
          ) : (
            <div>
              <CourseEditor
                courseId={selectedCourseId}
                onSave={(course) => {
                  console.log('Course saved:', course);
                  alert('Course saved successfully! Check console for details.');
                  setShowEditor(false);
                }}
                onCancel={() => setShowEditor(false)}
              />
            </div>
          )}
        </div>

        {/* API Requirements */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">API Requirements</h2>
          <div className="space-y-3 text-sm">
            <div>
              <code className="bg-blue-100 px-2 py-1 rounded text-blue-900 font-mono">
                GET /api/courses/:courseId
              </code>
              <p className="text-gray-700 mt-1">Fetch course data with statistics</p>
            </div>
            <div>
              <code className="bg-blue-100 px-2 py-1 rounded text-blue-900 font-mono">
                PUT /api/courses/:courseId
              </code>
              <p className="text-gray-700 mt-1">Update course with validation and permission checks</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Implementation Notes</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Form data is validated in real-time using the useFormValidation hook</li>
            <li>Draft is saved to localStorage to prevent data loss</li>
            <li>Auto-save to server occurs every 30 seconds when there are changes</li>
            <li>Unsaved changes warning prevents accidental navigation</li>
            <li>Cover images are validated for type and size (max 5MB)</li>
            <li>Learning objectives can be dynamically added and removed</li>
            <li>All API calls use React Query for caching and optimistic updates</li>
            <li>Notifications provide feedback for all user actions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CourseEditorDemo;

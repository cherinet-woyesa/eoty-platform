import React, { useState } from 'react';
import { CoursePublisher } from './CoursePublisher';
import type { Course } from '../../types/courses';

/**
 * CoursePublisher Demo Component
 * 
 * This component demonstrates the CoursePublisher functionality with different course states.
 * It shows how the publisher handles:
 * - Draft courses (unpublished)
 * - Published courses
 * - Scheduled courses
 * - Courses with validation errors
 * - Public/private visibility
 */
export const CoursePublisherDemo: React.FC = () => {
  // Sample courses with different states
  const [draftCourse, setDraftCourse] = useState<Course>({
    id: 1,
    title: 'Introduction to Orthodox Christianity',
    description: 'A comprehensive introduction to the Orthodox Christian faith',
    category: 'faith',
    level: 'beginner',
    cover_image: 'https://via.placeholder.com/400x300',
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    is_published: false,
    is_public: true,
    lesson_count: 5,
    student_count: 0,
    total_duration: 120
  });

  const [publishedCourse, setPublishedCourse] = useState<Course>({
    id: 2,
    title: 'Church History',
    description: 'Exploring the history of the Orthodox Church',
    category: 'history',
    level: 'intermediate',
    cover_image: 'https://via.placeholder.com/400x300',
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    is_published: true,
    published_at: new Date('2024-01-10'),
    is_public: true,
    lesson_count: 8,
    student_count: 25,
    total_duration: 240
  });

  const [scheduledCourse, setScheduledCourse] = useState<Course>({
    id: 3,
    title: 'Liturgical Practices',
    description: 'Understanding Orthodox liturgy and worship',
    category: 'liturgical',
    level: 'beginner',
    cover_image: 'https://via.placeholder.com/400x300',
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    is_published: false,
    scheduled_publish_at: new Date('2024-12-25T09:00:00'),
    is_public: true,
    lesson_count: 6,
    student_count: 0,
    total_duration: 180
  });

  const [incompleteCourse, setIncompleteCourse] = useState<Course>({
    id: 4,
    title: 'New Course',
    description: '',
    category: 'faith',
    level: 'beginner',
    created_by: 1,
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-01-20'),
    is_published: false,
    is_public: true,
    lesson_count: 0, // No lessons - will show validation error
    student_count: 0,
    total_duration: 0
  });

  const [privateCourse, setPrivateCourse] = useState<Course>({
    id: 5,
    title: 'Private Study Group',
    description: 'Exclusive content for invited members',
    category: 'spiritual',
    level: 'advanced',
    cover_image: 'https://via.placeholder.com/400x300',
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    is_published: true,
    published_at: new Date('2024-01-10'),
    is_public: false, // Private course
    lesson_count: 10,
    student_count: 5,
    total_duration: 300
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Course Publisher Demo</h1>
          <p className="mt-2 text-gray-600">
            Demonstration of the CoursePublisher component with different course states
          </p>
        </div>

        <div className="space-y-8">
          {/* Draft Course */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Draft Course</h2>
              <p className="text-sm text-gray-600">
                Course ready to be published with all requirements met
              </p>
            </div>
            <CoursePublisher
              course={draftCourse}
              onPublishSuccess={(updatedCourse) => {
                setDraftCourse(updatedCourse);
                console.log('Draft course updated:', updatedCourse);
              }}
            />
          </div>

          {/* Published Course */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Published Course</h2>
              <p className="text-sm text-gray-600">
                Course that is currently live and accessible to students
              </p>
            </div>
            <CoursePublisher
              course={publishedCourse}
              onPublishSuccess={(updatedCourse) => {
                setPublishedCourse(updatedCourse);
                console.log('Published course updated:', updatedCourse);
              }}
            />
          </div>

          {/* Scheduled Course */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Scheduled Course</h2>
              <p className="text-sm text-gray-600">
                Course scheduled to be automatically published at a future date
              </p>
            </div>
            <CoursePublisher
              course={scheduledCourse}
              onPublishSuccess={(updatedCourse) => {
                setScheduledCourse(updatedCourse);
                console.log('Scheduled course updated:', updatedCourse);
              }}
            />
          </div>

          {/* Incomplete Course */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Incomplete Course</h2>
              <p className="text-sm text-gray-600">
                Course with validation errors (no lessons added)
              </p>
            </div>
            <CoursePublisher
              course={incompleteCourse}
              onPublishSuccess={(updatedCourse) => {
                setIncompleteCourse(updatedCourse);
                console.log('Incomplete course updated:', updatedCourse);
              }}
            />
          </div>

          {/* Private Course */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Private Course</h2>
              <p className="text-sm text-gray-600">
                Published course with private visibility (invitation only)
              </p>
            </div>
            <CoursePublisher
              course={privateCourse}
              onPublishSuccess={(updatedCourse) => {
                setPrivateCourse(updatedCourse);
                console.log('Private course updated:', updatedCourse);
              }}
            />
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Instructions</h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Publishing States</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Draft:</strong> Course is being created/edited and not visible to students</li>
                <li><strong>Published:</strong> Course is live and visible to students</li>
                <li><strong>Scheduled:</strong> Course will be automatically published at the specified date/time</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Validation Requirements</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Course must have a title</li>
                <li>Course must have a category</li>
                <li>Course must have at least one lesson</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Visibility Control</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Public:</strong> Anyone can enroll in the course</li>
                <li><strong>Private:</strong> Only invited students can access the course</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Integration Example</h3>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
{`import { CoursePublisher } from './components/courses';

<CoursePublisher
  course={course}
  onPublishSuccess={(updatedCourse) => {
    // Handle successful publish/unpublish
    setCourse(updatedCourse);
  }}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePublisherDemo;

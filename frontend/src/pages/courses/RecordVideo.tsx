import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, BookOpen } from 'lucide-react';
import VideoRecorder from '../../components/courses/VideoRecorder';

const RecordVideo: React.FC = () => {
  const handleRecordingComplete = (videoUrl: string) => {
    console.log('Recording completed:', videoUrl);
    // You can add additional logic here, like showing a success message
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Record Video Lesson</h1>
            <p className="text-gray-600 mt-1">Create engaging video content for your students</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Recorder - 2/3 width */}
        <div className="lg:col-span-2">
          <VideoRecorder onRecordingComplete={handleRecordingComplete} />
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Tips Card */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
              <Video className="mr-2 h-5 w-5" />
              Recording Tips
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Ensure good lighting on your face</li>
              <li>• Use a quiet environment</li>
              <li>• Look directly at the camera</li>
              <li>• Keep videos under 15 minutes</li>
              <li>• Test audio quality before recording</li>
            </ul>
          </div>

          {/* Best Practices */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Best Practices
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900">Structure Your Content</h4>
                <p>Start with an introduction, cover main points, then summarize.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Engage Students</h4>
                <p>Ask questions and encourage participation in the comments.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Keep it Focused</h4>
                <p>One main topic per video works best for retention.</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Your Progress</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Videos This Month</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span>Total Students Reached</span>
                <span className="font-semibold">247</span>
              </div>
              <div className="flex justify-between">
                <span>Average Rating</span>
                <span className="font-semibold">4.8/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordVideo;
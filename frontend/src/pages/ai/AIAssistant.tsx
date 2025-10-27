import React from 'react';
import { Link } from 'react-router-dom';
import AIChatInterface from '../../components/ai/AIChatInterface';
import { ArrowLeft, Bot, BookOpen, Shield, Languages } from 'lucide-react';

const AIAssistant: React.FC = () => {
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
            <h1 className="text-3xl font-bold text-gray-900">Faith Assistant</h1>
            <p className="text-gray-600 mt-1">AI-powered guidance for your spiritual journey</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chat Interface - 3/4 width */}
        <div className="lg:col-span-3">
          <div className="h-[600px]">
            <AIChatInterface />
          </div>
        </div>

        {/* Features Sidebar - 1/4 width */}
        <div className="space-y-6">
          {/* Features Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              How It Works
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                <p>Ask questions about Orthodox Christianity</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                <p>Get faith-aligned answers from trusted sources</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                <p>Context-aware responses based on your current lesson</p>
              </div>
            </div>
          </div>

          {/* Doctrinal Safety */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Doctrinal Safety
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Aligned with Ethiopian Orthodox teachings</li>
              <li>• Sensitive topics flagged for moderation</li>
              <li>• References Scripture and Church Fathers</li>
              <li>• Encourages consultation with clergy</li>
            </ul>
          </div>

          {/* Language Support */}
          <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
              <Languages className="mr-2 h-5 w-5" />
              Language Support
            </h3>
            <div className="space-y-2 text-sm text-green-800">
              <div className="flex items-center justify-between">
                <span>English</span>
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">Available</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Amharic</span>
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Ask About
            </h3>
            <div className="space-y-2 text-sm text-purple-800">
              <div>• Scripture interpretation</div>
              <div>• Church traditions</div>
              <div>• Spiritual practices</div>
              <div>• Lesson clarification</div>
              <div>• Historical context</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
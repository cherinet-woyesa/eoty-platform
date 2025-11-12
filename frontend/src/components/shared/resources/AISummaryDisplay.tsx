import React, { useState } from 'react';
import type { AISummary } from '@/types/resources';
import { Brain, Lightbulb, BookOpen, RefreshCw, AlertCircle } from 'lucide-react';

interface AISummaryDisplayProps {
  summary?: AISummary | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onTypeChange: (type: string) => void;
}

const AISummaryDisplay: React.FC<AISummaryDisplayProps> = ({ 
  summary, 
  loading, 
  error, 
  onRetry,
  onTypeChange
}) => {
  const [summaryType, setSummaryType] = useState('brief');

  const handleTypeChange = (type: string) => {
    setSummaryType(type);
    onTypeChange(type);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Generating AI summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">AI Summary Unavailable</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Available</h3>
        <p className="text-gray-500 mb-4">Generate an AI summary to get insights from this resource.</p>
        <button
          onClick={() => handleTypeChange('brief')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Generate Summary
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {summary.summary_type === 'brief' ? 'Brief Summary' : 'Detailed Summary'}
            </span>
            <select
              value={summaryType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="brief">Brief</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          Generated using {summary.model_used} • {summary.word_count} words
        </div>
      </div>
      
      <div className="p-6">
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-line">{summary.summary}</p>
        </div>
        
        {summary.key_points && summary.key_points.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center mb-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="text-md font-semibold text-gray-900">Key Points</h4>
            </div>
            <ul className="space-y-2">
              {summary.key_points.map((point, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-5 w-5 text-blue-500 mt-0.5">•</span>
                  <span className="ml-2 text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {summary.spiritual_insights && summary.spiritual_insights.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center mb-3">
              <BookOpen className="h-5 w-5 text-purple-500 mr-2" />
              <h4 className="text-md font-semibold text-gray-900">Spiritual Insights</h4>
            </div>
            <ul className="space-y-2">
              {summary.spiritual_insights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 h-5 w-5 text-purple-500 mt-0.5">•</span>
                  <span className="ml-2 text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Relevance Score: {summary.relevance_score * 100}%
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryDisplay;
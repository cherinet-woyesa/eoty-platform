/**
 * FR7: Activity Logs Page
 * REQUIREMENT: Login history, abnormal activity alerts
 */

import React from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import ActivityLogs from '@/components/shared/activity/ActivityLogs';

const ActivityLogsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activity & Security</h1>
              <p className="text-gray-600 mt-1">
                View your login history and security alerts
              </p>
            </div>
          </div>
        </div>

        {/* Activity Logs Component */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <ActivityLogs showAlerts={true} />
        </div>

        {/* Security Tips */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Tips
          </h2>
          <div className="space-y-2 text-yellow-800 text-sm">
            <p>
              • Review your login history regularly to spot any unauthorized access
            </p>
            <p>
              • If you see activity from an unfamiliar location or device, change your password immediately
            </p>
            <p>
              • Enable two-factor authentication if available for additional security
            </p>
            <p>
              • Contact support if you notice any suspicious activity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogsPage;


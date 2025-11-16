/**
 * Admin Activity Logs Page
 * Admin-specific view of activity logs with enhanced admin features
 */

import React from 'react';
import { Shield, Clock, AlertTriangle, Users, Activity } from 'lucide-react';
import ActivityLogs from '@/components/shared/activity/ActivityLogs';

const AdminActivityLogs: React.FC = () => {
  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/20 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg border border-[#27AE60]/25">
                <Activity className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">Activity & Security Logs</h1>
              <p className="text-stone-700 text-sm mt-1">
                Monitor system-wide activity, login history, and security alerts
              </p>
            </div>
          </div>
        </div>

        {/* Activity Logs Component */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-gray-200 p-6">
          <ActivityLogs showAlerts={true} />
        </div>

        {/* Admin Security Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Security Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Best Practices
            </h2>
            <div className="space-y-2 text-yellow-800 text-sm">
              <p>
                • Review login history regularly to spot any unauthorized access
              </p>
              <p>
                • Monitor activity from unfamiliar locations or devices
              </p>
              <p>
                • Enable two-factor authentication for all admin accounts
              </p>
              <p>
                • Contact support immediately if you notice suspicious activity
              </p>
            </div>
          </div>

          {/* Admin Features */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Features
            </h2>
            <div className="space-y-2 text-blue-800 text-sm">
              <p>
                • View activity logs for all users across the platform
              </p>
              <p>
                • Monitor system-wide security events and alerts
              </p>
              <p>
                • Track login patterns and identify potential security issues
              </p>
              <p>
                • Export logs for audit and compliance purposes
              </p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default AdminActivityLogs;


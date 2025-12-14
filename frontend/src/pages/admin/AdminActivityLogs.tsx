/**
 * Admin Activity Logs Page
 * Admin-specific view of activity logs with enhanced admin features
 */

import React from 'react';
import { Shield, Clock, AlertTriangle, Users, Activity, RefreshCw } from 'lucide-react';
import ActivityLogs from '@/components/shared/activity/ActivityLogs';
import { brandColors } from '@/theme/brand';

const AdminActivityLogs: React.FC = () => {
  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              Activity Logs
            </h2>
            <p className="text-sm text-gray-500">Monitor system actions, security events, and admin activity.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border shadow-sm transition-colors"
            style={{ borderColor: `${brandColors.primaryHex}40`, color: brandColors.primaryHex }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: brandColors.primaryHex }}>
              <Shield className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
              Admin Features
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
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
    </div>
  );
};

export default AdminActivityLogs;


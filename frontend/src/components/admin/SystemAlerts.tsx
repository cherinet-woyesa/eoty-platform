import React from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import type { SystemAlert } from '@/types/admin';

interface SystemAlertsProps {
  alerts: SystemAlert[];
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts }) => {
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <h4 className="text-green-800 font-medium">All Systems Normal</h4>
            <p className="text-green-600 text-sm">No alerts or issues detected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
        >
          <div className="flex items-start space-x-3">
            {getAlertIcon(alert.severity)}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">{alert.message}</h4>
              
              {alert.chapter_id && (
                <p className="text-sm opacity-80">
                  Chapter: {alert.chapter_id}
                </p>
              )}
              
              {alert.content_type && (
                <p className="text-sm opacity-80">
                  Content Type: {alert.content_type}
                </p>
              )}
              
              {alert.count && (
                <p className="text-sm opacity-80">
                  Count: {alert.count}
                </p>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                alert.severity === 'critical' ? 'bg-red-200 text-red-900' :
                alert.severity === 'high' ? 'bg-red-200 text-red-900' :
                alert.severity === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                'bg-blue-200 text-blue-900'
              }`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemAlerts;
import React, { useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Server, Database, Shield, Users } from 'lucide-react';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  source: 'system' | 'security' | 'performance' | 'user';
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
}

interface SystemAlertsProps {
  alerts: Alert[];
  compact?: boolean;
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts, compact = false }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'system':
        return <Server className="h-3 w-3" />;
      case 'security':
        return <Shield className="h-3 w-3" />;
      case 'performance':
        return <Database className="h-3 w-3" />;
      case 'user':
        return <Users className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleResolveAlert = useCallback((alertId: string) => {
    // Handle alert resolution
    console.log('Resolving alert:', alertId);
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    // Handle alert dismissal
    console.log('Dismissing alert:', alertId);
  }, []);

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const resolvedAlerts = alerts.filter(alert => alert.resolved);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          System Alerts
        </h3>
        
        <div className="space-y-3">
          {activeAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-sm opacity-90">{alert.message}</p>
                    <div className="flex items-center space-x-2 mt-1 text-xs opacity-75">
                      <span>{formatTimeAgo(alert.timestamp)}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        {getSourceIcon(alert.source)}
                        <span>{alert.source}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {activeAlerts.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">All systems operational</p>
          </div>
        )}

        {/* Alert Summary */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Active alerts: {activeAlerts.length}</span>
            <span>Resolved: {resolvedAlerts.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Alerts</h2>
          <p className="text-gray-600 mt-1">Monitor platform health and issues</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            activeAlerts.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {activeAlerts.length > 0 ? `${activeAlerts.length} Active` : 'All Systems OK'}
          </span>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{activeAlerts.filter(a => a.priority === 'high').length}</div>
          <div className="text-sm text-red-700">High Priority</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{activeAlerts.filter(a => a.priority === 'medium').length}</div>
          <div className="text-sm text-yellow-700">Medium Priority</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{activeAlerts.filter(a => a.type === 'warning').length}</div>
          <div className="text-sm text-blue-700">Warnings</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</div>
          <div className="text-sm text-green-700">Resolved</div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Active Alerts</h3>
        {activeAlerts.length > 0 ? (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                        {alert.priority}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {alert.source}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-xs opacity-75">
                      <span className="flex items-center space-x-1">
                        {getSourceIcon(alert.source)}
                        <span>{alert.source}</span>
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Mark as resolved"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No active alerts</h4>
            <p className="text-gray-600">All systems are running smoothly.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex items-center space-x-3">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Acknowledge All
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          View Alert History
        </button>
      </div>
    </div>
  );
};

export default React.memo(SystemAlerts);
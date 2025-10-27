import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  format?: 'number' | 'percent' | 'duration';
}

const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color = 'blue',
  format = 'number'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  const formatValue = (val: string | number) => {
    if (format === 'percent') {
      return `${typeof val === 'number' ? (val * 100).toFixed(1) : val}%`;
    }
    if (format === 'duration') {
      return `${val}m`;
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (change === undefined) return 'text-gray-500';
    return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">
          {formatValue(value)}
        </h3>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  );
};

export default MetricsCard;
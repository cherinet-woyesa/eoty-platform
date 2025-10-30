import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change: number;
  format?: 'number' | 'percent' | 'currency';
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down';
  compact?: boolean;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  format = 'number',
  icon,
  color,
  trend,
  compact = false
}) => {
  const formatValue = (val: string | number) => {
    if (format === 'percent') return `${val}%`;
    if (format === 'currency') return `$${val}`;
    
    // Format large numbers
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isPositive = trend === 'up';
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeBgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className={`bg-white rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 ${
      compact ? 'p-3' : 'p-4'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${color} shadow-sm`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${changeBgColor} ${changeColor}`}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      
      <div>
        <p className={`font-bold text-gray-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
          {formatValue(value)}
        </p>
        <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} mt-1`}>
          {title}
        </p>
      </div>

      {/* Mini chart placeholder */}
      <div className="mt-3 flex items-center space-x-1">
        {[30, 45, 60, 75, 65, 80, 90].map((height, index) => (
          <div
            key={index}
            className={`flex-1 rounded-t ${
              isPositive 
                ? 'bg-gradient-to-t from-green-500 to-green-400' 
                : 'bg-gradient-to-t from-red-500 to-red-400'
            }`}
            style={{ height: `${height * 0.3}px` }}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(MetricsCard);
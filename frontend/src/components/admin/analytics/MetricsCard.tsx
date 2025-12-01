import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, Zap, Target, Rocket } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'teal';
  format?: 'number' | 'percent' | 'duration' | 'currency';
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  loading?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color = 'blue',
  format = 'number',
  trend,
  description,
  loading = false,
  onClick,
  interactive = false
}) => {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-200',
      glow: 'shadow-blue-500/10'
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      text: 'text-green-600',
      border: 'border-green-200',
      glow: 'shadow-green-500/10'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      text: 'text-purple-600',
      border: 'border-purple-200',
      glow: 'shadow-purple-500/10'
    },
    orange: {
      bg: 'bg-orange-50',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      text: 'text-orange-600',
      border: 'border-orange-200',
      glow: 'shadow-orange-500/10'
    },
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      text: 'text-red-600',
      border: 'border-red-200',
      glow: 'shadow-red-500/10'
    },
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      glow: 'shadow-indigo-500/10'
    },
    teal: {
      bg: 'bg-teal-50',
      iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
      text: 'text-teal-600',
      border: 'border-teal-200',
      glow: 'shadow-teal-500/10'
    }
  };

  const config = colorConfig[color];

  const formatValue = (val: string | number) => {
    if (format === 'percent') {
      return `${typeof val === 'number' ? val : parseFloat(val as string)}%`;
    }
    if (format === 'duration') {
      return `${val}m`;
    }
    if (format === 'currency') {
      return `$${typeof val === 'number' ? val.toLocaleString() : val}`;
    }
    if (typeof val === 'number' && val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const getTrendIcon = () => {
    const calculatedTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral');
    
    switch (calculatedTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendConfig = () => {
    const calculatedTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral');
    
    switch (calculatedTrend) {
      case 'up':
        return {
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Increase'
        };
      case 'down':
        return {
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <TrendingDown className="h-4 w-4" />,
          label: 'Decrease'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: <Minus className="h-4 w-4" />,
          label: 'No change'
        };
    }
  };

  const getAchievementBadge = () => {
    if (!change || change <= 0) return null;
    
    if (change > 20) {
      return {
        icon: <Rocket className="h-3 w-3" />,
        text: 'Rocket!',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500'
      };
    } else if (change > 10) {
      return {
        icon: <Zap className="h-3 w-3" />,
        text: 'Soaring',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
      };
    } else if (change > 5) {
      return {
        icon: <Target className="h-3 w-3" />,
        text: 'On Target',
        color: 'bg-gradient-to-r from-green-500 to-teal-500'
      };
    } else if (change > 2) {
      return {
        icon: <Sparkles className="h-3 w-3" />,
        text: 'Growing',
        color: 'bg-gradient-to-r from-blue-500 to-cyan-500'
      };
    }
    return null;
  };

  const trendConfig = getTrendConfig();
  const achievementBadge = getAchievementBadge();

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border ${config.border} p-6 animate-pulse ${interactive ? 'cursor-pointer hover:shadow-md transition-all duration-200' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
          <div className="w-16 h-6 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative bg-white rounded-2xl shadow-sm border ${config.border} p-6 transition-all duration-300 hover:shadow-lg ${config.glow} ${
        interactive ? 'cursor-pointer hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      {/* Background glow effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Icon */}
        <div className={`relative p-3 rounded-xl ${config.iconBg} text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
          {icon}
          {/* Icon glow */}
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        </div>
        
        {/* Trend Indicator */}
        {change !== undefined && (
          <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border ${trendConfig.border} ${trendConfig.bg} ${trendConfig.color} text-xs font-medium transition-all duration-300 group-hover:scale-105`}>
            {getTrendIcon()}
            <span>{change > 0 ? '+' : ''}{change?.toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
            {formatValue(value)}
          </h3>
          
          {/* Achievement Badge */}
          {achievementBadge && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-white text-xs font-bold ${achievementBadge.color} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
              {achievementBadge.icon}
              <span>{achievementBadge.text}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          
          {/* Mini trend indicator for mobile */}
          {change !== undefined && (
            <div className="lg:hidden flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-xs ${trendConfig.color}`}>
                {change > 0 ? '+' : ''}{change?.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            {description}
          </p>
        )}
      </div>

      {/* Interactive hover effect */}
      {interactive && (
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-300 transition-all duration-300 pointer-events-none" />
      )}

      {/* Performance indicator dots */}
      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            className={`w-1 h-1 rounded-full ${
              dot === 1 ? 'bg-green-400' : dot === 2 ? 'bg-yellow-400' : 'bg-red-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default MetricsCard;
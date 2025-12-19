import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, MessageSquare, FileText } from 'lucide-react';

interface QuickStatsProps {
  stats: {
    total_members: number;
    upcoming_events: number;
    active_discussions: number;
    resources_count: number;
  };
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('chapters.stats.members', 'Total Members'),
      value: stats.total_members,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: t('chapters.stats.events', 'Upcoming Events'),
      value: stats.upcoming_events,
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      label: t('chapters.stats.discussions', 'Active Discussions'),
      value: stats.active_discussions,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: t('chapters.stats.resources', 'Resources'),
      value: stats.resources_count,
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <div key={index} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${item.bg}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{item.value}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCommunityFeed, useForums } from '@/hooks/useCommunity';
import CommunityHub from '@/pages/shared/social/CommunityHub';
import TeacherAchievements from './TeacherAchievements';

const TeacherCommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const feed = useCommunityFeed();
  const { forums, loading: forumsLoading, error: forumsError } = useForums();

  const featuredForums = useMemo(() => forums.slice(0, 3), [forums]);

  const upcomingGatherings = useMemo(
    () => [
      {
        title: 'Lesson Planning Circle',
        time: 'Wednesday • 7:00 PM',
        description: 'Collaborative prep for this week’s Sunday School lesson outline.'
      },
      {
        title: 'Faith & Youth Q&A',
        time: 'Friday • 6:30 PM',
        description: 'Guided responses for tough youth questions across chapters.'
      },
      {
        title: 'Media Best Practices',
        time: 'Saturday • 10:00 AM',
        description: 'Share recording tips and examples for new AI lesson plans.'
      }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="space-y-10 pb-12">
        <CommunityHub variant="teacher" feedState={feed} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-[#27AE60]" />
                  {t('teacher_community.achievements.title')}
                </div>
                <button
                  onClick={() => navigate('/teacher/achievements')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#27AE60] hover:text-[#1E874B] transition"
                >
                  {t('shared.view_all', 'View all')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <TeacherAchievements />
            </div>

            <div className="space-y-6">
              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 uppercase tracking-wide">
                    <MessageSquare className="w-4 h-4 text-[#2980B9]" />
                    Chapter Forums
                  </div>
                  <button
                    onClick={() => navigate('/forums/1')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#27AE60] hover:text-[#1E874B] transition"
                  >
                    {t('shared.view_all', 'View all')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {forumsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : forumsError ? (
                  <p className="text-sm text-red-600">{forumsError}</p>
                ) : featuredForums.length ? (
                  <div className="space-y-3">
                    {featuredForums.map(forum => (
                      <button
                        key={forum.id}
                        onClick={() => navigate(`/forums/${forum.id}`)}
                        className="w-full text-left px-3 py-3 border border-slate-200 rounded-xl hover:border-[#27AE60]/40 hover:bg-[#27AE60]/5 transition-all"
                      >
                        <p className="text-sm font-semibold text-slate-800">{forum.title}</p>
                        {forum.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{forum.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Lead the way—create the first chapter forum for your teachers.
                  </p>
                )}
              </div>

              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-[#2980B9]" />
                  Upcoming Gatherings
                </div>
                <div className="space-y-3">
                  {upcomingGatherings.map(event => (
                    <div key={event.title} className="border border-slate-200 rounded-xl px-3 py-3">
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <p className="text-xs text-[#2980B9]">{event.time}</p>
                      <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/calendar')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#27AE60] hover:text-[#1E874B] transition"
                >
                  Plan my week
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white/95 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  <Users className="w-4 h-4 text-[#27AE60]" />
                  Personal Snapshot
                </div>
                <p className="text-sm text-slate-600">
                  {t('teacher_community.subtitle')}
                </p>
                {user?.first_name && (
                  <p className="text-sm text-slate-700">
                    {user.first_name}, you’ve helped build a community of faithful educators. Keep the momentum going!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCommunityPage;


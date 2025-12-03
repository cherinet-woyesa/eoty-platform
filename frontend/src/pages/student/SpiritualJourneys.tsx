import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { journeysApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass, Loader2, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Journey {
  id: number;
  title: string;
  description?: string;
  type: string;
  reward_badge_image?: string;
  progress_percentage?: number;
  status?: string;
  journey_id?: number; // For user journeys
}

const SpiritualJourneys: React.FC = () => {
  const { t } = useTranslation();
  const [myJourneys, setMyJourneys] = useState<Journey[]>([]);
  const [availableJourneys, setAvailableJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [myJourneysData, allJourneysData] = await Promise.all([
          journeysApi.getUserJourneys(),
          journeysApi.getJourneys()
        ]);

        setMyJourneys(Array.isArray(myJourneysData) ? myJourneysData : []);
        
        // Filter out journeys the user is already enrolled in
        const enrolledIds = new Set((Array.isArray(myJourneysData) ? myJourneysData : []).map((j: Journey) => j.journey_id || j.id));
        const available = (Array.isArray(allJourneysData) ? allJourneysData : []).filter((j: Journey) => !enrolledIds.has(j.id));
        
        setAvailableJourneys(available);
      } catch (e: any) {
        console.error('Failed to load journeys', e);
        setError(e.response?.data?.message || t('spiritual_journeys.load_failed'));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleEnroll = async (journeyId: number) => {
    try {
      await journeysApi.enroll(journeyId);
      // Reload data
      const [myJourneysData, allJourneysData] = await Promise.all([
        journeysApi.getUserJourneys(),
        journeysApi.getJourneys()
      ]);
      setMyJourneys(Array.isArray(myJourneysData) ? myJourneysData : []);
      const enrolledIds = new Set((Array.isArray(myJourneysData) ? myJourneysData : []).map((j: Journey) => j.journey_id || j.id));
      const available = (Array.isArray(allJourneysData) ? allJourneysData : []).filter((j: Journey) => !enrolledIds.has(j.id));
      setAvailableJourneys(available);
    } catch (e) {
      console.error('Failed to enroll', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('spiritual_journeys.loading_text')} variant="logo" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-emerald-100 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-100">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('spiritual_journeys.title')}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {t('spiritual_journeys.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* My Journeys */}
        {myJourneys.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-600" />
              {t('spiritual_journeys.my_active_journeys')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myJourneys.map((journey) => (
                <div key={journey.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-900">{journey.title}</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                      {journey.status === 'completed' ? t('spiritual_journeys.status_completed') : t('spiritual_journeys.status_in_progress')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{journey.description}</p>
                  
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${journey.progress_percentage || 0}%` }}
                    />
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/student/journeys/${journey.id}`)}
                    className="w-full py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {t('spiritual_journeys.continue_journey')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Journeys */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t('spiritual_journeys.available_journeys')}
          </h2>
          {availableJourneys.length === 0 ? (
            <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500">{t('spiritual_journeys.no_new_journeys')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableJourneys.map((journey) => (
                <div key={journey.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-200 transition-all">
                  <div className="mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider">
                      {journey.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{journey.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{journey.description}</p>
                  <button
                    onClick={() => handleEnroll(journey.id)}
                    className="w-full py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {t('spiritual_journeys.start_journey')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SpiritualJourneys;

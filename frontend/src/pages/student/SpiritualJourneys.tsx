import React, { useEffect, useState } from 'react';
import { journeysApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass, Loader2 } from 'lucide-react';

interface Journey {
  id: number;
  title: string;
  description?: string;
  progress?: number;
}

const SpiritualJourneys: React.FC = () => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadJourneys = async () => {
      try {
        setLoading(true);
        const response = await journeysApi.getJourneys();
        if (response.success && response.data?.journeys) {
          setJourneys(response.data.journeys);
        } else {
          setError(response.message || 'Failed to load journeys');
        }
      } catch (e: any) {
        console.error('Failed to load journeys', e);
        setError(e.response?.data?.message || 'Failed to load journeys');
      } finally {
        setLoading(false);
      }
    };

    void loadJourneys();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm text-slate-600">Loading your spiritual journeys...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] flex items-center justify-center">
        <div className="bg-white/90 rounded-2xl shadow-sm border border-rose-100 px-6 py-5 max-w-md text-center">
          <p className="text-sm text-rose-700 font-medium mb-2">Unable to load journeys</p>
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-100">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Spiritual Journeys
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Curated paths of courses and resources to guide you step by step.
              </p>
            </div>
          </div>
        </div>

        {/* Journeys list */}
        {journeys.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200/70 py-12 px-6 text-center">
            <Compass className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <h2 className="text-sm font-semibold text-slate-800 mb-1">No journeys yet</h2>
            <p className="text-xs text-slate-500">
              When your teachers or admins create a journey, it will appear here as a guided path.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => navigate(`/student/journeys/${journey.id}`)}
                className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-sm px-4 py-4 text-left hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      {journey.title}
                    </h3>
                    {journey.description && (
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {journey.description}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                    {typeof journey.progress === 'number'
                      ? `${journey.progress.toFixed(0)}%`
                      : '0%'}{' '}
                    complete
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpiritualJourneys;




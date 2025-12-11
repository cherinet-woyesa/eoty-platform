import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { journeysApi } from '@/services/api';
import { 
  ArrowLeft, CheckCircle2, Lock, Circle, PlayCircle, 
  FileText, HelpCircle, Trophy, Star 
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Milestone {
  id: number;
  title: string;
  description: string;
  type: 'content' | 'quiz' | 'action';
  status: 'locked' | 'available' | 'completed';
  order_index: number;
}

interface JourneyDetails {
  id: number;
  journey_title: string;
  journey_description: string;
  progress_percentage: number;
  status: string;
  milestones: Milestone[];
}

const JourneyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<JourneyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJourney = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await journeysApi.getUserJourneyDetails(id);
      setJourney(data);
    } catch (e: any) {
      console.error('Failed to load journey details', e);
      setError(e.response?.data?.message || 'Failed to load journey');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJourney();
  }, [id]);

  const handleCompleteMilestone = async (milestoneId: number) => {
    if (!id || !journey) return;
    try {
      await journeysApi.completeMilestone(id, milestoneId);
      await loadJourney(); // Reload to update status and unlock next
    } catch (e) {
      console.error('Failed to complete milestone', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'content': return <PlayCircle className="h-5 w-5" />;
      case 'quiz': return <HelpCircle className="h-5 w-5" />;
      case 'action': return <Star className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading journey path..." variant="logo" />
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-8 flex flex-col items-center justify-center">
        <p className="text-rose-600 mb-4">{error || 'Journey not found'}</p>
        <button onClick={() => navigate('/member/journeys')} className="text-emerald-600 hover:underline">
          Back to Journeys
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF8] via-[#FAF8F3] to-[#F5F3ED] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/member/journeys')}
          className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journeys
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-emerald-100 shadow-sm mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{journey.journey_title}</h1>
              <p className="text-slate-600">{journey.journey_description}</p>
            </div>
            {journey.status === 'completed' && (
              <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full flex items-center gap-2 font-medium">
                <Trophy className="h-5 w-5" />
                Completed!
              </div>
            )}
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
            <div 
              className="bg-emerald-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${journey.progress_percentage}%` }}
            />
          </div>
          <p className="text-right text-sm text-slate-500">{journey.progress_percentage}% Complete</p>
        </div>

        <div className="space-y-4 relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-slate-200 -z-10 hidden sm:block" />

          {journey.milestones.map((milestone, index) => {
            const isLocked = milestone.status === 'locked';
            const isCompleted = milestone.status === 'completed';
            const isAvailable = milestone.status === 'available';

            return (
              <div 
                key={milestone.id} 
                className={`relative flex gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl border transition-all ${
                  isLocked 
                    ? 'bg-slate-50 border-slate-200 opacity-75' 
                    : isCompleted
                    ? 'bg-emerald-50/50 border-emerald-100'
                    : 'bg-white border-emerald-200 shadow-md scale-[1.02]'
                }`}
              >
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-4 z-10 ${
                  isCompleted ? 'bg-emerald-100 border-emerald-50 text-emerald-600' :
                  isAvailable ? 'bg-white border-emerald-100 text-emerald-600 animate-pulse' :
                  'bg-slate-100 border-slate-50 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" /> :
                   isLocked ? <Lock className="h-5 w-5 sm:h-6 sm:w-6" /> :
                   <span className="text-lg font-bold">{index + 1}</span>}
                </div>

                <div className="flex-1 pt-1 sm:pt-2">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-lg font-semibold mb-1 ${isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                      {milestone.title}
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">
                      {milestone.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{milestone.description}</p>

                  {isAvailable && (
                    <button
                      onClick={() => handleCompleteMilestone(milestone.id)}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      {getIcon(milestone.type)}
                      {milestone.type === 'action' ? 'Mark as Complete' : 'Start Activity'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JourneyDetail;

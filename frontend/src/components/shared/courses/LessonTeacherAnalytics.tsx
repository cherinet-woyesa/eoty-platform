import React, { useEffect, useState } from 'react';
import { interactiveApi } from '@/services/api';
import { BarChart3, Users, MessageSquare, Bookmark, HelpCircle, Loader2 } from 'lucide-react';

interface LessonTeacherAnalyticsProps {
  lessonId: string;
}

interface LessonSummaryData {
  lessonId: number;
  quiz: {
    quizCount: number;
    totalAttempts: number;
    uniqueParticipants: number;
    averageScorePercentage: number;
  };
  annotations: {
    totalAnnotations: number;
    annotators: number;
  };
  discussions: {
    totalPosts: number;
    rootThreads: number;
    participants: number;
  };
  polls: {
    totalPolls: number;
    totalResponses: number;
  };
}

const LessonTeacherAnalytics: React.FC<LessonTeacherAnalyticsProps> = ({ lessonId }) => {
  const [summary, setSummary] = useState<LessonSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await interactiveApi.getLessonSummary(lessonId);
        if (response.success && response.data) {
          setSummary(response.data as LessonSummaryData);
        } else {
          setError('Failed to load lesson summary');
        }
      } catch (err: any) {
        console.error('Failed to load lesson summary:', err);
        setError(err?.response?.data?.message || 'Failed to load lesson summary');
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-4 flex items-center justify-center">
        <div className="flex items-center text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading lesson engagement…
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error || 'Unable to load lesson analytics.'}
      </div>
    );
  }

  const { quiz, annotations, discussions, polls } = summary;

  return (
    <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-100">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Lesson Engagement Overview
            </h3>
            <p className="text-[11px] text-slate-500">
              Quizzes, annotations, discussions, and polls for this lesson.
            </p>
          </div>
        </div>
        <HelpCircle className="h-4 w-4 text-slate-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
        <div className="rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
              Quizzes
            </span>
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800">{quiz.quizCount}</div>
          <div className="text-[11px] text-slate-500">
            {quiz.totalAttempts} attempts, {quiz.uniqueParticipants} learners
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
              Avg Quiz Score
            </span>
            <Users className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {Math.round(quiz.averageScorePercentage || 0)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Among all completed attempts
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
              Annotations
            </span>
            <Bookmark className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {annotations.totalAnnotations}
          </div>
          <div className="text-[11px] text-slate-500">
            {annotations.annotators} active note‑takers
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
              Discussion
            </span>
            <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {discussions.totalPosts} posts
          </div>
          <div className="text-[11px] text-slate-500">
            {discussions.participants} learners • {discussions.rootThreads} threads
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2.5 bg-slate-50/80 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold">
            {polls.totalPolls}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs sm:text-sm">Lesson Polls</div>
            <div className="text-[11px] text-slate-500">
              {polls.totalResponses} responses across all polls
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonTeacherAnalytics;




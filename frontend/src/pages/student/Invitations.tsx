import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { studentsApi } from '@/services/api/students';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Invitation {
  id: number;
  email: string;
  course_id: number | null;
  status: string;
  created_at: string;
  course_title?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
}

const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadInvitations = async () => {
      try {
        setLoading(true);
        const res = await studentsApi.getInvitations();
        setInvitations(res.data?.invitations || []);
      } catch (err: any) {
        console.error('Failed to load invitations:', err);
        setError('Failed to load invitations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    void loadInvitations();
  }, []);

  const handleRespond = async (invitationId: number, action: 'accept' | 'decline') => {
    try {
      setActingId(invitationId);
      setError(null);
      setSuccess(null);
      const res = await studentsApi.respondToInvitation(invitationId, action);
      setSuccess(res.message || `Invitation ${action}ed.`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      console.error('Failed to respond to invitation:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update invitation. Please try again.'
      );
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="flex items-center justify-center min-h-80">
          <LoadingSpinner size="lg" text="Loading your invitations..." variant="logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      <div className="bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-sky-500/90 rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Invitations</h1>
              <p className="text-xs sm:text-sm text-emerald-50/80">
                Accept invitations from teachers to join their courses.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="bg-white/95 rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
            <Mail className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-medium mb-1">No pending invitations</p>
            <p className="text-stone-500 text-sm mb-4">
              When a teacher invites you to a course, you’ll see it here.
            </p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="inline-flex items-center px-4 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white/95 rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {inv.course_title || 'Course invitation'}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Invited by{' '}
                    {inv.teacher_first_name
                      ? `${inv.teacher_first_name} ${inv.teacher_last_name || ''}`.trim()
                      : 'your teacher'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Sent to {inv.email}{' '}
                    {inv.created_at &&
                      ` • ${new Date(inv.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond(inv.id, 'decline')}
                    disabled={actingId === inv.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 bg-white hover:bg-stone-50 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(inv.id, 'accept')}
                    disabled={actingId === inv.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actingId === inv.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    )}
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invitations;



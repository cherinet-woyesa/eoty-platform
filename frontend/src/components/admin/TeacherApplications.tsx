import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Eye,
  RefreshCw,
  User,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Award,
  BookOpen,
  X
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { adminApi } from '@/services/api';

interface TeacherApplication {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  chapter_name?: string;
  chapter_location?: string;
  application_text: string;
  qualifications: string;
  experience?: string;
  subject_areas?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: number;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
  reviewed_at?: string;
  created_at: string;
  user_created_at: string;
}

const TeacherApplications: React.FC = () => {
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<TeacherApplication | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const response = await adminApi.getTeacherApplications(status);
      if (response.success) {
        setApplications(response.data.applications || []);
      } else {
        setError('Failed to fetch applications');
      }
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: number) => {
    try {
      setActionLoading(applicationId);
      const response = await adminApi.approveTeacherApplication(applicationId, adminNotes);
      if (response.success) {
        await fetchApplications();
        setShowModal(false);
        setSelectedApplication(null);
        setAdminNotes('');
      } else {
        setError('Failed to approve application');
      }
    } catch (err: any) {
      console.error('Error approving application:', err);
      setError(err.message || 'Failed to approve application');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: number) => {
    try {
      setActionLoading(applicationId);
      const response = await adminApi.rejectTeacherApplication(applicationId, adminNotes);
      if (response.success) {
        await fetchApplications();
        setShowModal(false);
        setSelectedApplication(null);
        setAdminNotes('');
      } else {
        setError('Failed to reject application');
      }
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      setError(err.message || 'Failed to reject application');
    } finally {
      setActionLoading(null);
    }
  };

  const openApplicationModal = (application: TeacherApplication) => {
    setSelectedApplication(application);
    setAdminNotes(application.admin_notes || '');
    setShowModal(true);
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchTerm === '' || 
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.chapter_name && app.chapter_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#39FF14]/20 text-[#39FF14]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
                  <div className="relative p-2 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                    <GraduationCap className="h-6 w-6 text-[#39FF14]" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-800">Teacher Applications</h1>
              </div>
              <p className="text-stone-700 text-sm mt-2">Review and manage teacher role applications</p>
            </div>
            <button
              onClick={fetchApplications}
              className="flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-stone-800 rounded-lg border border-[#39FF14]/30 hover:bg-white transition-all shadow-sm hover:shadow-md hover:border-[#39FF14]/50"
            >
              <RefreshCw className="h-4 w-4 mr-2 text-[#39FF14]" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, email, or chapter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#39FF14]/50 focus:border-[#39FF14]/50 bg-white/90 backdrop-blur-sm"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-800 shadow-md'
                      : 'bg-white/90 backdrop-blur-sm text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white/90 backdrop-blur-md rounded-xl border border-stone-200">
          <GraduationCap className="h-12 w-12 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600">No {statusFilter === 'all' ? '' : statusFilter} applications found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                {/* Left: Applicant Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-700">
                        {app.first_name} {app.last_name}
                      </h3>
                      <div className="flex items-center text-sm text-slate-600 mt-1">
                        <Mail className="h-4 w-4 mr-1" />
                        {app.email}
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  {app.chapter_name && (
                    <div className="flex items-center text-sm text-slate-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {app.chapter_name} {app.chapter_location && `- ${app.chapter_location}`}
                    </div>
                  )}

                  <div className="flex items-center text-xs text-slate-500 mb-3">
                    <Calendar className="h-3 w-3 mr-1" />
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </div>

                  {/* Application Preview */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Why they want to teach:</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{app.application_text}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Qualifications:</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{app.qualifications}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 lg:min-w-[200px]">
                  {app.status === 'pending' && (
                    <>
                      <button
                        onClick={() => openApplicationModal(app)}
                        className="flex items-center justify-center px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white transition-all"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApplication(app);
                          setAdminNotes('');
                          setShowModal(true);
                        }}
                        className="flex items-center justify-center px-4 py-2 bg-[#39FF14] text-slate-900 rounded-lg hover:bg-[#32E60F] transition-all font-semibold"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Quick Approve
                      </button>
                    </>
                  )}
                  {app.status !== 'pending' && (
                    <div className="text-sm text-slate-600">
                      {app.status === 'approved' && app.reviewer_first_name && (
                        <p>Reviewed by: {app.reviewer_first_name} {app.reviewer_last_name}</p>
                      )}
                      {app.reviewed_at && (
                        <p className="text-xs mt-1">
                          {new Date(app.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application Detail Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-700">Application Details</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedApplication(null);
                  setAdminNotes('');
                }}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Applicant Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Name</p>
                  <p className="text-slate-700">{selectedApplication.first_name} {selectedApplication.last_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Email</p>
                  <p className="text-slate-700">{selectedApplication.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Chapter</p>
                  <p className="text-slate-700">
                    {selectedApplication.chapter_name || 'N/A'}
                    {selectedApplication.chapter_location && ` - ${selectedApplication.chapter_location}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Applied On</p>
                  <p className="text-slate-700">{new Date(selectedApplication.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Application Text */}
              <div>
                <div className="flex items-center mb-2">
                  <FileText className="h-4 w-4 text-[#00FFFF] mr-2" />
                  <p className="text-sm font-semibold text-slate-700">Why do you want to teach?</p>
                </div>
                <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                  {selectedApplication.application_text}
                </p>
              </div>

              {/* Qualifications */}
              <div>
                <div className="flex items-center mb-2">
                  <Award className="h-4 w-4 text-[#00FFFF] mr-2" />
                  <p className="text-sm font-semibold text-slate-700">Qualifications</p>
                </div>
                <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                  {selectedApplication.qualifications}
                </p>
              </div>

              {/* Experience */}
              {selectedApplication.experience && (
                <div>
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-4 w-4 text-[#00FFFF] mr-2" />
                    <p className="text-sm font-semibold text-slate-700">Teaching Experience</p>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                    {selectedApplication.experience}
                  </p>
                </div>
              )}

              {/* Subject Areas */}
              {selectedApplication.subject_areas && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Subject Areas of Interest</p>
                  <p className="text-slate-600 bg-slate-50 p-4 rounded-lg">
                    {selectedApplication.subject_areas}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedApplication.status === 'pending' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this application..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300/50 rounded-lg focus:ring-2 focus:ring-[#00FFFF]/20 focus:border-[#00FFFF]"
                  />
                </div>
              )}

              {/* Previous Notes */}
              {selectedApplication.admin_notes && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Previous Admin Notes</p>
                  <p className="text-slate-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                    {selectedApplication.admin_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedApplication.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200/50">
                  <button
                    onClick={() => handleReject(selectedApplication.id)}
                    disabled={actionLoading === selectedApplication.id}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-white/90 backdrop-blur-sm text-red-700 rounded-lg border-2 border-red-300/50 hover:bg-red-50 transition-all font-semibold disabled:opacity-50"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApplication.id)}
                    disabled={actionLoading === selectedApplication.id}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-[#39FF14] text-slate-900 rounded-lg hover:bg-[#32E60F] transition-all font-semibold disabled:opacity-50"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TeacherApplications;


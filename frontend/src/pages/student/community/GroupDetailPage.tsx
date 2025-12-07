import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Users, MessageCircle, FileText, Upload, Calendar, 
  Crown, Settings, UserPlus, ArrowLeft, Send, Paperclip,
  CheckCircle, Clock, AlertCircle, File, Download, Eye,
  Trash2, MoreVertical, Search, Filter, X, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyGroupsApi } from '@/services/api/studyGroups';
import { useNotification } from '@/context/NotificationContext';

interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
  avatar?: string;
  status?: 'online' | 'offline';
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  created_by: string;
  created_by_name: string;
  status: 'pending' | 'submitted' | 'graded';
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  assignment_title: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  file_url?: string;
  notes?: string;
  grade?: number;
  feedback?: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  course_id?: string;
  course_title?: string;
  member_count: number;
  max_members: number;
  is_public: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  members: GroupMember[];
}

const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'assignments' | 'submissions'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade?: number; feedback?: string }>>({});

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['study-group', groupId],
    queryFn: async () => {
      const res = await studyGroupsApi.get(Number(groupId));
      if (res?.success === false) throw new Error(res?.message || 'Failed to load group');
      return res?.data;
    },
    enabled: !!groupId,
    staleTime: 1000 * 30
  });

  const group = useMemo<StudyGroup | null>(() => {
    if (!data) return null;
    if ((data as any).group) return (data as any).group as StudyGroup;
    return data as StudyGroup;
  }, [data]);

  const membersData = useMemo(() => {
    if (!data) return [];
    if ((data as any).members) return (data as any).members as any[];
    if ((data as any).group?.members) return (data as any).group.members as any[];
    if ((data as any).members) return (data as any).members as any[];
    if ((data as any).membersData) return (data as any).membersData as any[];
    if ((data as any).members_list) return (data as any).members_list as any[];
    return [];
  }, [data]);

  // Messages
  const messagesQuery = useQuery({
    queryKey: ['study-group-messages', groupId],
    queryFn: async () => {
      const res = await studyGroupsApi.listMessages(Number(groupId));
      return res?.data?.messages || [];
    },
    enabled: !!groupId
  });

  const postMessageMutation = useMutation({
    mutationFn: async () => {
      const content = newMessage.trim();
      return studyGroupsApi.postMessage(Number(groupId), content);
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to send message')
  });

  // Assignments
  const assignmentsQuery = useQuery({
    queryKey: ['study-group-assignments', groupId],
    queryFn: async () => {
      const res = await studyGroupsApi.listAssignments(Number(groupId));
      return res?.data?.assignments || [];
    },
    enabled: !!groupId
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: { title: string; description?: string; due_date?: string; total_points?: number }) =>
      studyGroupsApi.createAssignment(Number(groupId), payload),
    onSuccess: () => {
      showNotification('success', 'Assignment created', 'Group assignment posted');
      queryClient.invalidateQueries({ queryKey: ['study-group-assignments', groupId] });
      setShowNewAssignmentModal(false);
    },
    onError: () => showNotification('error', 'Error', 'Failed to create assignment')
  });

  const assignments = useMemo(() => assignmentsQuery.data || [], [assignmentsQuery.data]);
  const isTeacher = user?.role === 'teacher';

  const submissionsQuery = useQuery({
    queryKey: ['study-group-submissions', groupId, assignments.map((a: any) => a.id).join(',')],
    queryFn: async () => {
      const all: any[] = [];
      for (const a of assignments) {
        const res = await studyGroupsApi.listSubmissions(Number(a.id));
        const subs = res?.data?.submissions || [];
        all.push(...subs.map((s: any) => ({ ...s, assignment_id: a.id, assignment_title: a.title })));
      }
      return all;
    },
    enabled: !!groupId && assignments.length > 0
  });

  const submissions = useMemo(() => {
    const subs = submissionsQuery.data || [];
    if (isTeacher) return subs;
    return subs.filter((s: any) => String(s.student_id) === String(user?.id));
  }, [submissionsQuery.data, isTeacher, user?.id]);

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, content }: { assignmentId: number; content?: string }) => {
      return studyGroupsApi.submitAssignment(assignmentId, { content: content || 'Submitted via app' });
    },
    onSuccess: () => {
      showNotification('success', 'Submitted', 'Your submission is saved');
      queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to submit assignment')
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ assignmentId, submissionId, grade, feedback }: { assignmentId: number; submissionId: number; grade?: number; feedback?: string }) => {
      return studyGroupsApi.gradeSubmission(assignmentId, submissionId, { grade, feedback });
    },
    onSuccess: () => {
      showNotification('success', 'Graded', 'Submission graded');
      queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] });
    },
    onError: () => showNotification('error', 'Error', 'Failed to grade submission')
  });

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !user?.id) return;
    postMessageMutation.mutate();
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [newMessage, postMessageMutation, user?.id]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return (membersData || []).some(m => m.id === user?.id && m.role === 'admin');
  }, [membersData, user?.id]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!searchMember) return membersData || [];
    return (membersData || []).filter(m => 
      m.name.toLowerCase().includes(searchMember.toLowerCase())
    );
  }, [membersData, searchMember]);

  if (isLoading || messagesQuery.isLoading || assignmentsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#27AE60]" />
      </div>
    );
  }

  if (isError || messagesQuery.isError || assignmentsQuery.isError || !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Group Not Found</h2>
          <p className="text-stone-600 mb-6">The study group you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            to="/student/study-groups"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Study Groups
          </Link>
          <div className="mt-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm bg-white border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-stone-200">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => navigate('/student/study-groups')}
              className="flex items-center text-stone-600 hover:text-stone-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Groups
            </button>
            {isAdmin && (
              <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-stone-600" />
              </button>
            )}
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">{group.name}</h1>
              <p className="text-stone-600 mb-3">{group.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.member_count} members
                </span>
                {group.course_title && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {group.course_title}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {new Date(group.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200 overflow-hidden">
          <div className="border-b border-stone-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  activeTab === 'members'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Users className="h-5 w-5" />
                Members ({membersData.length || group.member_count || 0})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  activeTab === 'assignments'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <FileText className="h-5 w-5" />
                Assignments ({assignmentsQuery.data?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  activeTab === 'submissions'
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-stone-600 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Upload className="h-5 w-5" />
                Submissions ({submissions.length || 0})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-[500px] bg-stone-50/50 rounded-lg p-4 overflow-y-auto border border-stone-200">
                  {messagesQuery.data?.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-600">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messagesQuery.data?.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${msg.user_id === user?.id ? 'order-2' : 'order-1'}`}>
                            {msg.user_id !== user?.id && (
                              <p className="text-xs text-stone-600 mb-1 px-1">{msg.user_name}</p>
                            )}
                            <div
                              className={`rounded-lg p-3 ${
                                msg.user_id === user?.id
                                  ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white'
                                  : 'bg-white border border-stone-200 text-stone-800'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.user_id === user?.id ? 'text-white/70' : 'text-stone-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                {/* Message Input */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60]/50 resize-none"
                    />
                    <button className="absolute right-2 bottom-2 p-2 hover:bg-stone-100 rounded-lg transition-colors">
                      <Paperclip className="h-5 w-5 text-stone-600" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                  disabled={!newMessage.trim() || postMessageMutation.isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  {postMessageMutation.isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50"
                    />
                  </div>
                  {isAdmin && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all">
                      <UserPlus className="h-5 w-5" />
                      Invite Members
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#27AE60] to-[#16A085] flex items-center justify-center text-white font-bold flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-stone-800 truncate">{member.name}</h3>
                            {member.role === 'admin' && (
                              <Crown className="h-4 w-4 text-[#FFD700] flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-stone-600 capitalize">{member.role}</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {member.joined_at ? `Joined ${new Date(member.joined_at).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-stone-800">Group Assignments</h3>
                  {isAdmin && (
                    <button
                      onClick={() => setShowNewAssignmentModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <FileText className="h-5 w-5" />
                      Create Assignment
                    </button>
                  )}
                </div>

                {(assignmentsQuery.data?.length || 0) === 0 ? (
                  <div className="text-center py-12 bg-stone-50/50 rounded-lg border border-stone-200">
                    <FileText className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No assignments yet</h3>
                    <p className="text-stone-600">
                      {isAdmin ? 'Create your first assignment to get started' : 'No assignments have been created yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentsQuery.data?.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-stone-800 mb-1">{assignment.title}</h4>
                            <p className="text-sm text-stone-600 mb-2">{assignment.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {assignment.total_points} points
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {!isTeacher && (
                              <button
                                onClick={() => submitMutation.mutate({ assignmentId: Number(assignment.id) })}
                                disabled={submitMutation.isLoading}
                                className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {submitMutation.isLoading ? 'Submitting...' : 'Submit'}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] })}
                                className="text-sm text-stone-600 underline"
                              >
                                Refresh submissions
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-stone-800">
                  {isTeacher ? 'All Submissions' : 'My Submissions'}
                </h3>
                
                {(submissions.length || 0) === 0 ? (
                  <div className="text-center py-12 bg-stone-50/50 rounded-lg border border-stone-200">
                    <Upload className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No submissions yet</h3>
                    <p className="text-stone-600">
                      {isTeacher ? 'Students have not submitted work yet.' : 'Complete assignments to see your submissions here'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission: any) => {
                      const key = `${submission.assignment_id}-${submission.id}`;
                      const gradeState = gradeInputs[key] || { grade: submission.grade, feedback: submission.feedback };
                      return (
                      <div
                        key={submission.id}
                        className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-stone-800 mb-1">{submission.assignment_title || `Assignment ${submission.assignment_id}`}</h4>
                            <p className="text-sm text-stone-600 mb-2">
                              Submitted on {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                            {submission.notes && (
                              <p className="text-sm text-stone-500 italic">"{submission.notes}"</p>
                            )}
                          </div>
                          {submission.grade !== undefined && (
                            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold">
                              {submission.grade}%
                            </div>
                          )}
                        </div>
                        
                        {submission.feedback && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Teacher Feedback:</p>
                            <p className="text-sm text-blue-800">{submission.feedback}</p>
                          </div>
                        )}

                        {isTeacher && (
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-3 items-center">
                              <label className="text-sm text-stone-700">Grade</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={gradeState.grade ?? ''}
                                onChange={(e) =>
                                  setGradeInputs((prev) => ({
                                    ...prev,
                                    [key]: { ...gradeState, grade: e.target.value ? Number(e.target.value) : undefined }
                                  }))
                                }
                                className="w-24 px-2 py-1 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/40"
                              />
                            </div>
                            <textarea
                              value={gradeState.feedback ?? ''}
                              onChange={(e) =>
                                setGradeInputs((prev) => ({
                                  ...prev,
                                  [key]: { ...gradeState, feedback: e.target.value }
                                }))
                              }
                              placeholder="Feedback (optional)"
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/40"
                              rows={2}
                            />
                            <button
                              onClick={() => {
                                gradeMutation.mutate({
                                  assignmentId: submission.assignment_id,
                                  submissionId: submission.id,
                                  grade: gradeState.grade,
                                  feedback: gradeState.feedback
                                });
                              }}
                              disabled={gradeMutation.isLoading}
                              className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                            >
                              {gradeMutation.isLoading ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {submission.file_url && (
                            <button className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm">
                              <Eye className="h-4 w-4" />
                              View File
                            </button>
                          )}
                          <button className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm">
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage;


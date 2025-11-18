import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Users, MessageCircle, FileText, Upload, Calendar, 
  Crown, Settings, UserPlus, ArrowLeft, Send, Paperclip,
  CheckCircle, Clock, AlertCircle, File, Download, Eye,
  Trash2, MoreVertical, Search, Filter, X, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'assignments' | 'submissions'>('chat');
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  // Load group data
  useEffect(() => {
    loadGroupData();
    loadChatMessages();
    loadAssignments();
    loadSubmissions();
  }, [groupId, user?.id]);

  const loadGroupData = useCallback(() => {
    try {
      setLoading(true);
      const savedGroups = localStorage.getItem(`study_groups_${user?.id}`);
      if (savedGroups) {
        const allGroups: StudyGroup[] = JSON.parse(savedGroups);
        const foundGroup = allGroups.find(g => g.id === groupId);
        if (foundGroup) {
          setGroup(foundGroup);
        }
      }
    } catch (error) {
      console.error('Failed to load group:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  const loadChatMessages = useCallback(() => {
    const savedMessages = localStorage.getItem(`group_chat_${groupId}`);
    if (savedMessages) {
      try {
        setChatMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.warn('Failed to parse chat messages');
      }
    }
  }, [groupId]);

  const loadAssignments = useCallback(() => {
    const savedAssignments = localStorage.getItem(`group_assignments_${groupId}`);
    if (savedAssignments) {
      try {
        setAssignments(JSON.parse(savedAssignments));
      } catch (e) {
        console.warn('Failed to parse assignments');
      }
    }
  }, [groupId]);

  const loadSubmissions = useCallback(() => {
    const savedSubmissions = localStorage.getItem(`group_submissions_${groupId}`);
    if (savedSubmissions) {
      try {
        setSubmissions(JSON.parse(savedSubmissions));
      } catch (e) {
        console.warn('Failed to parse submissions');
      }
    }
  }, [groupId]);

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !user?.id) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender_id: user.id,
      sender_name: `${user.firstName} ${user.lastName}`,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, message];
    setChatMessages(updatedMessages);
    localStorage.setItem(`group_chat_${groupId}`, JSON.stringify(updatedMessages));
    setNewMessage('');
    
    // Auto-scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [newMessage, chatMessages, groupId, user]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return group?.members.some(m => m.id === user?.id && m.role === 'admin');
  }, [group, user?.id]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!searchMember) return group?.members || [];
    return group?.members.filter(m => 
      m.name.toLowerCase().includes(searchMember.toLowerCase())
    ) || [];
  }, [group?.members, searchMember]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#27AE60]" />
      </div>
    );
  }

  if (!group) {
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
                Members ({group.member_count})
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
                Assignments ({assignments.length})
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
                Submissions ({submissions.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-[500px] bg-stone-50/50 rounded-lg p-4 overflow-y-auto border border-stone-200">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-600">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'order-2' : 'order-1'}`}>
                            {msg.sender_id !== user?.id && (
                              <p className="text-xs text-stone-600 mb-1 px-1">{msg.sender_name}</p>
                            )}
                            <div
                              className={`rounded-lg p-3 ${
                                msg.sender_id === user?.id
                                  ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white'
                                  : 'bg-white border border-stone-200 text-stone-800'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-white/70' : 'text-stone-500'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
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
                            Joined {new Date(member.joined_at).toLocaleDateString()}
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

                {assignments.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50/50 rounded-lg border border-stone-200">
                    <FileText className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No assignments yet</h3>
                    <p className="text-stone-600">
                      {isAdmin ? 'Create your first assignment to get started' : 'No assignments have been created yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
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
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {assignment.total_points} points
                              </span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            assignment.status === 'graded'
                              ? 'bg-green-100 text-green-700'
                              : assignment.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {assignment.status === 'graded' && <CheckCircle className="inline h-3 w-3 mr-1" />}
                            {assignment.status === 'submitted' && <Clock className="inline h-3 w-3 mr-1" />}
                            {assignment.status === 'pending' && <AlertCircle className="inline h-3 w-3 mr-1" />}
                            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                          </div>
                        </div>
                        <button className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors font-medium text-sm">
                          View Assignment
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-stone-800">My Submissions</h3>
                
                {submissions.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50/50 rounded-lg border border-stone-200">
                    <Upload className="h-16 w-16 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No submissions yet</h3>
                    <p className="text-stone-600">Complete assignments to see your submissions here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="bg-white border border-stone-200 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-stone-800 mb-1">{submission.assignment_title}</h4>
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
                    ))}
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


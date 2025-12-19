import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Users, MessageCircle, FileText, Upload, Calendar,
  Crown, Settings, UserPlus, ArrowLeft, Send, Paperclip,
  AlertCircle, Download, Eye,
  MoreVertical, Search, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyGroupsApi } from '@/services/api/studyGroups';
import { useNotification } from '@/context/NotificationContext';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import AssignmentSubmissionModal from '../components/AssignmentSubmissionModal';
import { brandColors } from '@/theme/brand';

interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
  avatar?: string;
  status?: 'online' | 'offline';
}

interface ChatMessage {
  id: string | number;
  group_id?: string | number;
  user_id: string | number;
  user_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
  profile_picture?: string;
  parent_message_id?: string | number | null;
  likes_count?: number;
  liked_by_user?: boolean;
  attachments?: string[];
  replies?: ChatMessage[];
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

const ChatMessageItem: React.FC<{
  msg: ChatMessage;
  parentMessage?: ChatMessage;
  currentUserId?: string | number;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (id: number) => void;
  onLike: (id: number | string) => void;
  onReport: (id: number | string) => void;
  onScrollToMessage: (id: string | number) => void;
}> = ({ msg, parentMessage, currentUserId, onReply, onEdit, onDelete, onLike, onReport, onScrollToMessage }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMine = String(msg.user_id) === String(currentUserId);
  const [highlighted, setHighlighted] = useState(false);

  // Flash effect when scrolled to
  useEffect(() => {
    const handleFlash = () => {
      setHighlighted(true);
      setTimeout(() => setHighlighted(false), 2000);
    };

    // Add custom event listener for scrolling to this message
    const element = document.getElementById(`message-${msg.id}`);
    if (element) {
      element.addEventListener('flash-message', handleFlash);
    }
    return () => {
      if (element) {
        element.removeEventListener('flash-message', handleFlash);
      }
    };
  }, [msg.id]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onDelete(Number(msg.id));
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onReport(msg.id);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onLike(msg.id);
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onReply(msg);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);
    onEdit(msg);
  };

  const likesCount = msg.likes_count || 0;
  const isLiked = msg.liked_by_user || false;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      id={`message-${msg.id}`}
      className={`space-y-1 transition-colors duration-1000 ${highlighted ? 'bg-[#cbeded] rounded-lg p-1' : ''}`}
    >
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] ${isMine ? 'order-2' : 'order-1'} group`}>
          {!isMine && (
            <p className="text-xs text-slate-600 mb-1 px-1 font-medium">{msg.user_name}</p>
          )}
          <div
            className={`rounded-lg p-3 shadow-sm ${isMine
              ? 'text-white'
              : 'bg-white border border-slate-200 text-slate-800'
              }`}
            style={
              isMine
                ? { backgroundColor: brandColors.primaryHex }
                : {}
            }
          >
            {/* Quoted Reply Preview */}
            {parentMessage && (
              <div
                onClick={() => onScrollToMessage(parentMessage.id)}
                className={`mb-2 rounded text-xs p-2 border-l-4 cursor-pointer hover:opacity-90 transition-opacity ${isMine
                  ? 'bg-white/20 border-white/50 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-600'
                  }`}
              >
                <div className={`font-bold mb-0.5 ${isMine ? 'text-white' : 'text-[#27AE60]'}`}>
                  {parentMessage.user_name}
                </div>
                <div className="line-clamp-1 opacity-90">
                  {parentMessage.content}
                </div>
              </div>
            )}

            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            <div className={`flex items-center gap-3 text-xs mt-2 ${isMine ? 'text-white/80' : 'text-slate-500'}`}>
              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1 ${isMine ? 'text-white' : isLiked ? 'text-red-500' : 'text-slate-600'} hover:opacity-80 transition-colors cursor-pointer`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <svg
                  className="h-4 w-4"
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>
              <button
                type="button"
                onClick={handleReply}
                className={`${isMine ? 'text-white' : 'text-slate-600'} hover:opacity-80 cursor-pointer`}
              >
                Reply
              </button>
              <div className="ml-auto relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMenuOpen(!menuOpen);
                  }}
                  className={`${isMine ? 'text-white' : 'text-slate-600'} hover:opacity-80 cursor-pointer p-1`}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 w-36 text-slate-800">
                    {isMine ? (
                      <>
                        <button
                          type="button"
                          onClick={handleEdit}
                          className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReport}
                        className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 cursor-pointer"
                      >
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GroupDetailPageProps {
  embedded?: boolean;
}

const GroupDetailPage: React.FC<GroupDetailPageProps> = ({ embedded = false }) => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backTab = (location.state as any)?.fromTab || 'my-groups';
  const { showNotification } = useNotification();
  const { confirm } = useConfirmDialog();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'assignments' | 'submissions'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | number | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<any[]>([]);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade?: number; feedback?: string }>>({});
  const messageBoxRef = useRef<HTMLTextAreaElement>(null);

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
      console.debug('[GroupDetail] Sending postMessage', { groupId, content, replyingToId });
      return studyGroupsApi.postMessage(Number(groupId), content, replyingToId || undefined);
    },
    onSuccess: () => {
      setNewMessage('');
      setReplyingToId(null);
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: 'Failed to send message' })
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => studyGroupsApi.deleteMessage(Number(groupId), messageId),
    onSuccess: () => {
      showNotification({ type: 'success', title: 'Deleted', message: 'Message deleted' });
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: 'Failed to delete message' })
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) =>
      ((): Promise<any> => {
        console.debug('[GroupDetail] editMessage', { groupId, messageId, content });
        return studyGroupsApi.editMessage(Number(groupId), messageId, content);
      })(),
    onSuccess: () => {
      setEditingMessageId(null);
      setNewMessage('');
      setReplyingToId(null);
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: 'Failed to edit message' })
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (editingMessageId) {
      editMessageMutation.mutate({ messageId: editingMessageId, content: newMessage.trim() });
    } else {
      postMessageMutation.mutate();
    }
  };

  const handleToggleLike = async (messageId: number | string) => {
    // Optimistic update - fix to handle the correct data structure
    queryClient.setQueryData(['study-group-messages', groupId], (old: any) => {
      if (!old) return old;
      // Handle both {data: {messages: []}} and direct array structures
      const messages = old?.data?.messages || old;
      if (!Array.isArray(messages)) return old;

      const updatedMessages = messages.map((m: any) => {
        if (String(m.id) === String(messageId)) {
          const wasLiked = m.liked_by_user;
          return {
            ...m,
            liked_by_user: !wasLiked,
            likes_count: wasLiked ? Math.max(0, (m.likes_count || 1) - 1) : (m.likes_count || 0) + 1
          };
        }
        return m;
      });

      // Return in the same structure as received
      if (old?.data?.messages) {
        return { ...old, data: { ...old.data, messages: updatedMessages } };
      }
      return updatedMessages;
    });

    try {
      await studyGroupsApi.toggleMessageLike(Number(groupId), Number(messageId));
      // Refresh to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['study-group-messages', groupId] });
      showNotification({ type: 'error', title: 'Error', message: 'Failed to like message' });
    }
  };

  const handleReport = (messageId: number | string) => {
    studyGroupsApi.reportMessage(Number(groupId), Number(messageId))
      .then(() => showNotification({ type: 'success', title: 'Reported', message: 'Thanks for letting us know' }))
      .catch(() => showNotification({ type: 'error', title: 'Error', message: 'Failed to report message' }));
  };

  const startReply = (msg: any) => {
    setReplyingToId(msg.id);
    setNewMessage('');
    setEditingMessageId(null);
    // Scroll to input
    setTimeout(() => {
      if (messageBoxRef.current) {
        messageBoxRef.current.focus();
        messageBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Sort messages chronologically
  const sortedMessages = useMemo(() => {
    const msgs = (messagesQuery.data as any[]) || [];
    return [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messagesQuery.data]);

  // Map for quick parent lookup
  const messageMap = useMemo(() => {
    const map = new Map();
    if (messagesQuery.data) {
      (messagesQuery.data as any[]).forEach(m => map.set(String(m.id), m));
    }
    return map;
  }, [messagesQuery.data]);

  const scrollToMessage = (messageId: string | number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Trigger flash effect
      const event = new Event('flash-message');
      element.dispatchEvent(event);
    }
  };

  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.style.height = 'auto';
      messageBoxRef.current.style.height = `${messageBoxRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  const startEditing = (msg: any) => {
    setEditingMessageId(Number(msg.id));
    setNewMessage(msg.content || '');
    setReplyingToId(null);
    if (messageBoxRef.current) {
      messageBoxRef.current.focus();
      // Set cursor to end of text
      setTimeout(() => {
        if (messageBoxRef.current) {
          messageBoxRef.current.selectionStart = messageBoxRef.current.value.length;
          messageBoxRef.current.selectionEnd = messageBoxRef.current.value.length;
        }
      }, 0);
    }
  };

  const handleStudyGroupSubmit = async (id: number, payload: { content?: string; file?: File }) => {
    return submitMutation.mutateAsync({ assignmentId: id, content: payload.content });
  };

  const handleDeleteMessage = async (messageId: number) => {
    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (confirmed) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // Assignments
  const assignmentsQuery = useQuery({
    queryKey: ['study-group-assignments', groupId],
    queryFn: async () => {
      const res = await studyGroupsApi.listAssignments(Number(groupId));
      return res?.data?.assignments || [];
    },
    enabled: !!groupId
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
      showNotification({ type: 'success', title: 'Submitted', message: 'Your submission is saved' });
      queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: 'Failed to submit assignment' })
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ assignmentId, submissionId, grade, feedback }: { assignmentId: number; submissionId: number; grade?: number; feedback?: string }) => {
      return studyGroupsApi.gradeSubmission(assignmentId, submissionId, { grade, feedback });
    },
    onSuccess: () => {
      showNotification({ type: 'success', title: 'Graded', message: 'Submission graded' });
      queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] });
    },
    onError: () => showNotification({ type: 'error', title: 'Error', message: 'Failed to grade submission' })
  });



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
      <div className={`${embedded ? 'h-64' : 'min-h-screen'} bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center`}>
        <Loader2 className="h-12 w-12 animate-spin text-[#27AE60]" />
      </div>
    );
  }

  if (isError || messagesQuery.isError || assignmentsQuery.isError || !group) {
    return (
      <div className={`${embedded ? 'py-12' : 'min-h-screen'} bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4`}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Group Not Found</h2>
          <p className="text-stone-600 mb-6">The study group you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            to={(() => {
              const path = window.location.pathname;
              if (path.includes('/admin')) return '/admin/community/study-groups';
              if (path.includes('/teacher')) return '/teacher/community/study-groups';
              if (path.includes('/member')) return '/member/community/study-groups';
              return '/community/study-groups';
            })()}
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
    <div className={`${embedded ? '' : 'min-h-screen'} bg-slate-50 transition-all duration-300`}>
      <div className={`${embedded ? 'px-4 py-2 sm:px-6' : 'max-w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-8'}`}>
        {/* Header */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <button
              onClick={() => {
                const path = window.location.pathname;
                let target = '/community/study-groups';
                if (path.includes('/admin')) target = '/admin/community/study-groups';
                else if (path.includes('/teacher')) target = '/teacher/community/study-groups';
                else if (path.includes('/member')) target = '/member/community/study-groups';

                navigate(target, { state: { activeTab: backTab } });
              }}
              className="flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Groups
            </button>
            {isAdmin && (
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">{group.name}</h1>
                {group.is_public ? (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Public</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Private</span>
                )}
              </div>
              <p className="text-sm text-slate-600 line-clamp-1 mb-2">{group.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {group.member_count} members
                </span>
                {group.course_title && (
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <FileText className="h-3.5 w-3.5" />
                    {group.course_title}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-xs transition-colors border-b-2 ${activeTab === 'chat'
                  ? 'bg-[#1e1b4b]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                style={activeTab === 'chat' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-xs transition-colors border-b-2 ${activeTab === 'members'
                  ? 'bg-[#1e1b4b]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                style={activeTab === 'members' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
              >
                <Users className="h-4 w-4" />
                Members ({membersData.length || group.member_count || 0})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-xs transition-colors border-b-2 ${activeTab === 'assignments'
                  ? 'bg-[#1e1b4b]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                style={activeTab === 'assignments' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
              >
                <FileText className="h-4 w-4" />
                Assignments ({assignmentsQuery.data?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-xs transition-colors border-b-2 ${activeTab === 'submissions'
                  ? 'bg-[#1e1b4b]/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                style={activeTab === 'submissions' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
              >
                <Upload className="h-4 w-4" />
                Submissions ({submissions.length || 0})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-[500px] bg-slate-50/50 rounded-lg p-4 overflow-y-auto border border-slate-200">
                  {sortedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedMessages.map((msg: any) => (
                        <ChatMessageItem
                          key={msg.id}
                          msg={msg}
                          parentMessage={msg.parent_message_id ? messageMap.get(String(msg.parent_message_id)) : undefined}
                          currentUserId={user?.id}
                          onReply={startReply}
                          onEdit={startEditing}
                          onDelete={handleDeleteMessage}
                          onLike={handleToggleLike}
                          onReport={handleReport}
                          onScrollToMessage={scrollToMessage}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <div className="relative">
                    {editingMessageId && (
                      <div className="absolute -top-8 left-1 text-xs bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 flex items-center gap-2">
                        <svg className="h-3 w-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-yellow-700">Editing message</span>
                        <button
                          type="button"
                          className="text-yellow-600 hover:text-yellow-800 font-medium"
                          onClick={() => {
                            setEditingMessageId(null);
                            setNewMessage('');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {!editingMessageId && replyingToId && (
                      <div className="absolute -top-8 left-1 text-xs bg-blue-50 border border-blue-200 rounded-md px-2 py-1 flex items-center gap-2">
                        <MessageCircle className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-700">Replying to message</span>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => {
                            setReplyingToId(null);
                            setNewMessage('');
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <textarea
                      ref={messageBoxRef}
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
                      className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b] resize-none"
                    />
                    <button className="absolute right-2 bottom-2 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <Paperclip className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || postMessageMutation.isPending}
                    className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                  >
                    <Send className="h-5 w-5" />
                    {postMessageMutation.isPending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
                    />
                  </div>
                  {isAdmin && (
                    <button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all" style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}>
                      <UserPlus className="h-5 w-5" />
                      Invite Members
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800 truncate">{member.name}</h3>
                            {member.role === 'admin' && (
                              <Crown className="h-4 w-4 text-[#cfa15a] flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 capitalize">{member.role}</p>
                          <p className="text-xs text-slate-500 mt-1">
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
                  <h3 className="text-lg font-semibold text-slate-800">Group Assignments</h3>
                  {isAdmin && (
                    <button
                      onClick={() => setShowNewAssignmentModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all"
                      style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                    >
                      <FileText className="h-5 w-5" />
                      Create Assignment
                    </button>
                  )}
                </div>

                {(assignmentsQuery.data?.length || 0) === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-lg border border-slate-200">
                    <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No assignments yet</h3>
                    <p className="text-slate-600">
                      {isAdmin ? 'Create your first assignment to get started' : 'No assignments have been created yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentsQuery.data?.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 mb-1">{assignment.title}</h4>
                            <p className="text-sm text-slate-600 mb-2">{assignment.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setShowSubmissionModal(true);
                                }}
                                disabled={submitMutation.isPending}
                                className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                              >
                                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] })}
                                className="text-sm text-slate-600 underline"
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
                <h3 className="text-lg font-semibold text-slate-800">
                  {isTeacher ? 'All Submissions' : 'My Submissions'}
                </h3>

                {(submissions.length || 0) === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-lg border border-slate-200">
                    <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No submissions yet</h3>
                    <p className="text-slate-600">
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
                          className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 mb-1">{submission.assignment_title || `Assignment ${submission.assignment_id}`}</h4>
                              <p className="text-sm text-slate-600 mb-2">
                                Submitted on {new Date(submission.submitted_at).toLocaleString()}
                              </p>
                              {submission.notes && (
                                <p className="text-sm text-slate-500 italic">"{submission.notes}"</p>
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
                                <label className="text-sm text-slate-700">Grade</label>
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
                                  className="w-24 px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
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
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 focus:border-[#1e1b4b]"
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
                                disabled={gradeMutation.isPending}
                                className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                                style={{ background: `linear-gradient(to right, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                              >
                                {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {submission.file_url && (
                              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm">
                                <Eye className="h-4 w-4" />
                                View File
                              </button>
                            )}
                            <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm">
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

      {selectedAssignment && (
        <AssignmentSubmissionModal
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          assignmentId={selectedAssignment.id}
          assignmentTitle={selectedAssignment.title}
          onSuccess={() => {
            setSelectedAssignment(null);
            queryClient.invalidateQueries({ queryKey: ['study-group-submissions', groupId] });
          }}
          customSubmitFn={handleStudyGroupSubmit}
        />
      )}
    </div>
  );
};

export default GroupDetailPage;


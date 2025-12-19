import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/api/apiClient';
import { format } from 'date-fns';
import {
  Mail, Clock, Tag, CheckCircle,
  MessageSquare, Search, RefreshCw, Send,
  MoreVertical, Archive
} from 'lucide-react';

interface Ticket {
  id: number;
  subject: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

const SupportTicketsTab: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/support/tickets');
      if (response.data.success) {
        setTickets(response.data.tickets);
        // Select first ticket by default if none selected
        if (!selectedTicket && response.data.tickets.length > 0) {
          // Optional: setSelectedTicket(response.data.tickets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setSendingReply(true);
      const response = await apiClient.post(`/support/tickets/${selectedTicket.id}/reply`, {
        message: replyMessage
      });

      if (response.data.success) {
        setReplySuccess(true);
        setReplyMessage('');
        fetchTickets();
        setTimeout(() => setReplySuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      (ticket.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (`${ticket.first_name || ''} ${ticket.last_name || ''}`).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'replied': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'text-purple-600 bg-purple-50';
      case 'billing': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  if (loading && !tickets.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading support center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] bg-white rounded-xl shadow-sm border border-gray-200 flex overflow-hidden">
      {/* Sidebar List */}
      <div className="w-1/3 min-w-[320px] border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {filteredTickets.length}
              </span>
              <button onClick={() => fetchTickets()} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'open', 'replied', 'closed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap transition-colors ${filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No tickets found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 hover:bg-white transition-all duration-200 ${selectedTicket?.id === ticket.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm z-10' : 'border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ticket.status === 'open' ? 'text-yellow-700 bg-yellow-50' :
                      ticket.status === 'closed' ? 'text-gray-600 bg-gray-100' :
                        'text-blue-700 bg-blue-50'
                      }`}>
                      {ticket.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(ticket.created_at), 'MMM d')}
                    </span>
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 truncate ${selectedTicket?.id === ticket.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {ticket.subject}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {ticket.first_name || ''} {ticket.last_name || ''}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${getTypeColor(ticket.type)}`}>
                      {ticket.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
        {selectedTicket ? (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)} capitalize`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                      {selectedTicket.first_name ? selectedTicket.first_name[0] : (selectedTicket.email ? selectedTicket.email[0] : '?')}
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedTicket.first_name || ''} {selectedTicket.last_name || ''}
                    </span>
                    <span className="text-gray-400">&lt;{selectedTicket.email}&gt;</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Archive">
                  <Archive className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="More options">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Reply Section */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare className="w-4 h-4" />
                  Write a reply
                </div>
                <div className="p-4">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={6}
                    className="w-full border-0 focus:ring-0 p-0 text-gray-800 placeholder-gray-400 resize-none bg-transparent"
                    placeholder="Type your response here..."
                  />
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                  <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200/50">
                    <Tag className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    {replySuccess && (
                      <span className="text-green-600 text-sm font-medium flex items-center animate-in fade-in">
                        <CheckCircle className="w-4 h-4 mr-1" /> Sent!
                      </span>
                    )}
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow"
                    >
                      {sendingReply ? (
                        <>Sending...</>
                      ) : (
                        <>
                          Send Reply <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a ticket</h3>
            <p className="text-gray-500 max-w-sm text-center">
              Choose a ticket from the sidebar to view details and start a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTicketsTab;

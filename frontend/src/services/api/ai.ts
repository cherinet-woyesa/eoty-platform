import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const aiApi = {
  // Ask a question to AI
  askQuestion: async (question: string, sessionId?: string, context?: any) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/ai/ask`, {
      question,
      sessionId,
      context
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get conversation history
  getConversationHistory: async (sessionId?: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE}/ai/conversation`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { sessionId }
    });
    return response.data;
  },

  // Clear conversation history
  clearConversation: async (sessionId?: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/ai/conversation/clear`, {
      sessionId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Report or escalate an AI interaction for moderation
  reportQuestion: async (payload: {
    question: string;
    sessionId?: string;
    context?: any;
    moderation?: any;
  }) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/ai/report`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Telemetry for performance and acceptance criteria
  sendTelemetry: async (payload: {
    sessionId?: string;
    context?: any;
    totalTimeMs: number;
    success: boolean;
    errorMessage?: string;
  }) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/ai/telemetry`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Privacy-safe conversation summary logging
  logSummary: async (payload: {
    sessionId?: string;
    language?: string;
    route?: string;
    questionLength: number;
    answerLength?: number;
    flagged?: boolean;
  }) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE}/ai/summary`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
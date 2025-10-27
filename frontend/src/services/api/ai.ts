import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

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
  }
};
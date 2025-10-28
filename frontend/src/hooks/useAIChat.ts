import { useState, useCallback, useRef } from 'react';
import { aiApi } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
  detectedLanguage?: string;
}

interface PerformanceMetrics {
  totalTimeMs?: number;
  aiResponseTimeMs?: number;
  storeTimeMs?: number;
  responseTimeMs?: number;
}

interface UseAIChatReturn {
  messages: Message[];
  isProcessing: boolean;
  error: string | null;
  sessionId: string;
  askQuestion: (question: string, context?: any) => Promise<void>;
  clearConversation: () => Promise<void>;
  loadConversationHistory: () => Promise<void>;
}

export const useAIChat = (initialSessionId = 'default'): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(initialSessionId);
  
  // For real-time streaming responses
  const abortControllerRef = useRef<AbortController | null>(null);

  const askQuestion = useCallback(async (question: string, context: any = {}) => {
    if (!question.trim()) return;

    setIsProcessing(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      const response = await aiApi.askQuestion(question, sessionId, context);
      
      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date(),
          metadata: {
            relevantContent: response.data.relevantContent,
            sources: response.data.sources,
            relatedResources: response.data.relatedResources,
            moderation: response.data.moderation,
            guidance: response.data.guidance,
            guidanceProvided: response.data.guidanceProvided,
            responseTimeMs: response.data.responseTimeMs,
            performanceMetrics: response.data.performanceMetrics
          },
          detectedLanguage: response.data.detectedLanguage
        };

        setMessages(prev => [...prev, aiMessage]);

        // Show moderation warning if needed
        if (response.data.moderation?.needsModeration) {
          console.warn('Question flagged for moderation:', response.data.moderationWarning);
        }
        
        // Show guidance if provided
        if (response.data.guidance && response.data.guidance.length > 0) {
          console.info('Guidance provided:', response.data.guidance);
        }
        
        // Log slow responses with detailed metrics
        const perfMetrics: PerformanceMetrics = response.data.performanceMetrics || {};
        if (perfMetrics.totalTimeMs && perfMetrics.totalTimeMs > 3000) {
          console.warn(`Slow response time: ${perfMetrics.totalTimeMs}ms`, {
            aiResponseTime: perfMetrics.aiResponseTimeMs,
            storeTime: perfMetrics.storeTimeMs
          });
        }
      } else {
        throw new Error(response.message || 'Failed to get AI response');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, which is expected behavior
        return;
      }
      setError(err.message || 'An error occurred while processing your question');
      console.error('AI question error:', err);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [sessionId]);

  const clearConversation = useCallback(async () => {
    try {
      await aiApi.clearConversation(sessionId);
      setMessages([]);
      setError(null);
    } catch (err: any) {
      setError('Failed to clear conversation');
      console.error('Clear conversation error:', err);
    }
  }, [sessionId]);

  const loadConversationHistory = useCallback(async () => {
    try {
      const response = await aiApi.getConversationHistory(sessionId);
      
      if (response.success) {
        const historyMessages: Message[] = response.data.history.map((msg: any) => ({
          id: `hist-${msg.created_at}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined
        }));
        
        setMessages(historyMessages);
      }
    } catch (err: any) {
      console.error('Load conversation history error:', err);
    }
  }, [sessionId]);

  return {
    messages,
    isProcessing,
    error,
    sessionId,
    askQuestion,
    clearConversation,
    loadConversationHistory
  };
};
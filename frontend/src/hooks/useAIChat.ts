// frontend/src/hooks/useAIChat.ts

import { useState, useCallback, useRef } from 'react';
import { aiApi } from '../services/api';

export interface MessageMetadata {
  performanceMetrics?: {
    totalTimeMs: number;
    processingTimeMs?: number;
  };
  faithAlignment?: {
    score: number;
    feedback?: string;
  };
  moderation?: {
    needsModeration: boolean;
    flags: string[];
    faithAlignmentScore: number;
    moderatedContent?: string;
  };
  guidance?: string[];
  sources?: string[];
  relatedResources?: Array<{ 
    title: string; 
    type?: string;
    url?: string;
  }>;
  sessionId?: string;
  isError?: boolean;
  errorCode?: string;
  confidence?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  detectedLanguage?: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface UseAIChatReturn {
  messages: Message[];
  isProcessing: boolean;
  error: string | null;
  sessionId: string;
  askQuestion: (question: string, context: any) => Promise<void>;
  clearConversation: () => void;
  loadConversationHistory: () => void;
  retryLastQuestion: () => Promise<void>;
}

export interface AIApiResponse {
  answer: string;
  content?: string;
  metadata?: MessageMetadata;
  detectedLanguage?: string;
  sessionId?: string;
}

// Extended AI API interface with optional methods
interface ExtendedAIApi {
  askQuestion: (question: string, sessionId?: string, context?: any) => Promise<AIApiResponse>;
  getConversationHistory?: (sessionId?: string) => Promise<any>;
  clearConversation?: (sessionId?: string) => Promise<any>;
  sendTelemetry?: (telemetryData: any) => Promise<any>;
  logSummary?: (summaryData: any) => Promise<any>;
}

const useAIChat = (): UseAIChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const lastQuestionRef = useRef<{ question: string; context: any } | null>(null);

  const generateMessageId = (): string => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const askQuestion = useCallback(async (question: string, context: any = {}) => {
    if (!question.trim()) return;

    setIsProcessing(true);
    setError(null);
    lastQuestionRef.current = { question, context };

    const startTime = Date.now();

    try {
      // Add user message to UI immediately
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: question,
        timestamp: new Date(),
        metadata: {
          sessionId: sessionIdRef.current
        },
        status: 'sending'
      };

      setMessages(prev => [...prev, userMessage]);

      // Call AI API
      const response: AIApiResponse = await aiApi.askQuestion(question, sessionIdRef.current, context);
      
      // Calculate response time
      const totalTimeMs = Date.now() - startTime;

      // Create AI message from response
      const aiMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.answer || response.content || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
        metadata: {
          ...response.metadata,
          performanceMetrics: {
            totalTimeMs
          },
          sessionId: sessionIdRef.current
        },
        detectedLanguage: response.detectedLanguage,
        status: 'sent'
      };

      // Update user message status to sent and add AI message - FIXED TYPE ERROR
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'sent' as const } : msg
        );
        return [...updatedMessages, aiMessage];
      });

      // Send telemetry data if available - FIXED OPTIONAL METHOD CHECK
      if ('sendTelemetry' in aiApi && typeof aiApi.sendTelemetry === 'function') {
        try {
          await (aiApi as ExtendedAIApi).sendTelemetry!({
            sessionId: sessionIdRef.current,
            context,
            totalTimeMs,
            success: true,
            messageCount: messages.length + 1
          });
        } catch (telemetryError) {
          console.warn('Telemetry failed:', telemetryError);
        }
      }

      // Log summary if available - FIXED OPTIONAL METHOD CHECK
      if ('logSummary' in aiApi && typeof aiApi.logSummary === 'function') {
        try {
          await (aiApi as ExtendedAIApi).logSummary!({
            sessionId: sessionIdRef.current,
            language: context.language || context.detectedLanguage || 'en',
            route: context.route,
            questionLength: question.length,
            answerLength: aiMessage.content.length,
            flagged: !!response.metadata?.moderation?.needsModeration
          });
        } catch (summaryError) {
          console.warn('Summary logging failed:', summaryError);
        }
      }

    } catch (err: any) {
      console.error('Error asking AI question:', err);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to get response from AI service';

      setError(errorMessage);

      // Update user message status to error - FIXED TYPE ERROR
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'user') {
          return prev.map(msg => 
            msg.id === lastMessage.id ? { ...msg, status: 'error' as const } : msg
          );
        }
        return prev;
      });

      // Send error telemetry if available - FIXED OPTIONAL METHOD CHECK
      if ('sendTelemetry' in aiApi && typeof aiApi.sendTelemetry === 'function') {
        try {
          await (aiApi as ExtendedAIApi).sendTelemetry!({
            sessionId: sessionIdRef.current,
            context,
            totalTimeMs: Date.now() - startTime,
            success: false,
            errorMessage,
            messageCount: messages.length
          });
        } catch (telemetryError) {
          console.warn('Error telemetry failed:', telemetryError);
        }
      }

      // Add error message to conversation
      const errorMessageObj: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
        metadata: {
          sessionId: sessionIdRef.current,
          isError: true,
          errorCode: err.response?.status?.toString() || 'UNKNOWN_ERROR'
        },
        status: 'sent'
      };

      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsProcessing(false);
    }
  }, [messages.length]);

  const retryLastQuestion = useCallback(async () => {
    if (lastQuestionRef.current) {
      const { question, context } = lastQuestionRef.current;
      await askQuestion(question, context);
    }
  }, [askQuestion]);

  const clearConversation = useCallback(async () => {
    try {
      // Clear on server if method exists - FIXED OPTIONAL METHOD CHECK
      if ('clearConversation' in aiApi && typeof aiApi.clearConversation === 'function') {
        await (aiApi as ExtendedAIApi).clearConversation!(sessionIdRef.current);
      }
      
      // Clear locally
      setMessages([]);
      setError(null);
      lastQuestionRef.current = null;
      
      // Generate new session ID
      sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } catch (err) {
      console.error('Error clearing conversation:', err);
      // Still clear locally even if server call fails
      setMessages([]);
      setError(null);
      lastQuestionRef.current = null;
      sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  const loadConversationHistory = useCallback(async () => {
    try {
      // FIXED OPTIONAL METHOD CHECK
      if ('getConversationHistory' in aiApi && typeof aiApi.getConversationHistory === 'function') {
        const history = await (aiApi as ExtendedAIApi).getConversationHistory!(sessionIdRef.current);
        
        if (history && Array.isArray(history.messages)) {
          const formattedMessages: Message[] = history.messages.map((msg: any) => ({
            id: msg.id || generateMessageId(),
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp || Date.now()),
            metadata: msg.metadata,
            detectedLanguage: msg.detectedLanguage,
            status: 'sent' as const
          }));
          
          setMessages(formattedMessages);
        }
      }
    } catch (err) {
      console.error('Error loading conversation history:', err);
      // Don't set error state for history loading failures
    }
  }, []);

  return {
    messages,
    isProcessing,
    error,
    sessionId: sessionIdRef.current,
    askQuestion,
    clearConversation,
    loadConversationHistory,
    retryLastQuestion
  };
};

export default useAIChat;
// frontend/src/components/ai/AIChatInterface.tsx - COMPLETE ENHANCED VERSION

import * as React from 'react';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import useAIChat, { type Message, type UseAIChatReturn } from '@/hooks/useAIChat';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { speechToText } from '@/services/api/speechToText';
import { aiApi } from '@/services/api';
import { 
  Send, Bot, User, Trash2, AlertTriangle, 
  BookOpen, Loader, Mic, MicOff,
  Volume2, VolumeX, Globe, Clock, CheckCircle, FileText,
  Flag, MessageCircle, X, RotateCcw, ThumbsUp, ThumbsDown
} from 'lucide-react';

export interface AIChatInterfaceProps {
  context?: any;
  onClose?: () => void;
  className?: string;
  maxHeight?: string;
}

export interface AIChatInterfaceHandle {
  /**
   * Programmatically ask a quick question from outside the component.
   * Used by the AI Assistant page for "Quick Questions".
   */
  askQuickQuestion: (question: string) => void;
}

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  isFallback?: boolean;
  originalLanguage?: string;
}

const AIChatInterface = forwardRef<AIChatInterfaceHandle, AIChatInterfaceProps>(
  ({
    context,
    onClose,
    className = '',
    maxHeight = '600px'
  }, ref) => {
  const [input, setInput] = useState<string>('');
  const [isUsingAudio, setIsUsingAudio] = useState<boolean>(false);
  const [isSlowResponse, setIsSlowResponse] = useState<boolean>(false);
  const [showLanguageWarning, setShowLanguageWarning] = useState<boolean>(false);
  const [inputRows, setInputRows] = useState<number>(1);
  const [userFeedback, setUserFeedback] = useState<{ [key: string]: 'positive' | 'negative' }>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  
  // Properly typed hook usage
  const {
    messages,
    isProcessing,
    error,
    sessionId,
    askQuestion,
    clearConversation,
    loadConversationHistory,
    retryLastQuestion
  } = useAIChat() as UseAIChatReturn;

  const {
    isRecording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    error: audioError,
    detectedLanguage,
    setDetectedLanguage,
    recordingTime,
    audioQuality,
    resetRecording
  } = useAudioRecorder();

  // UI-controlled language selection (overrides automatic detection when set)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    detectedLanguage || i18n.language || speechToText.getUserLanguage() || 'en-US'
  );

  // Enhanced auto-scroll to bottom
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    };

    requestAnimationFrame(scrollToBottom);
  }, [messages, isProcessing]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Handle audio recording complete
  useEffect(() => {
    if (audioBlob && !isRecording) {
      transcribeAudio();
    }
  }, [audioBlob, isRecording]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
      setInputRows(newHeight > 48 ? 2 : 1);
    }
  }, [input]);

  // Enhanced slow response detection
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isProcessing) {
      setIsSlowResponse(false);
      timer = setTimeout(() => setIsSlowResponse(true), 5000);
    } else {
      setIsSlowResponse(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isProcessing]);

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsUsingAudio(true);
    try {
      // Enhanced audio quality validation
      const qualityCheck = speechToText.validateAudioQuality(audioBlob);
      if (!qualityCheck.valid) {
        const qualityMessage = `Audio quality issue: ${qualityCheck.issues.join(', ')}. Please try again in a quieter environment.`;
        setInput(qualityMessage);
        setIsUsingAudio(false);
        return;
      }

      let transcription: TranscriptionResult;
      const browserSupport = speechToText.getBrowserCompatibility();

      // Prefer explicit user-selected language when available, otherwise use detectedLanguage
      const recognitionLanguage = selectedLanguage || detectedLanguage || undefined;

      // If user selected an Ethiopian language, prefer cloud transcription first for reliability
      const ethiopianLangs = ['am-ET', 'ti-ET', 'om-ET'];
      const prefersCloud = recognitionLanguage && ethiopianLangs.includes(recognitionLanguage as string);

      if (prefersCloud) {
        // Use cloud transcription first for Ethiopian languages
        transcription = await speechToText.transcribeWithCloudService(audioBlob, recognitionLanguage || 'en-US');
        setInput(transcription.transcript);
        setDetectedLanguage(transcription.language || recognitionLanguage || null);
        if (transcription.isFallback) {
          setShowLanguageWarning(true);
          setTimeout(() => setShowLanguageWarning(false), 5000);
        }
      } else {
        // Browser-first flow for English and other supported languages
        if (browserSupport.supported) {
          transcription = await speechToText.startEnhancedBrowserRecognition(recognitionLanguage);

          // Enhanced confidence handling
          if (transcription.confidence < 0.7) {
            setInput(`${transcription.transcript} (Low confidence - please verify)`);
          } else {
            setInput(transcription.transcript);
          }

          setDetectedLanguage(transcription.language || recognitionLanguage || null);

          // Enhanced language warning
          if (transcription.isFallback) {
            setShowLanguageWarning(true);
            setTimeout(() => setShowLanguageWarning(false), 5000);
          }
        } else {
          // Fallback to cloud service
          transcription = await speechToText.transcribeAudio(audioBlob, recognitionLanguage || undefined);
          setInput(transcription.transcript);
          setDetectedLanguage(transcription.language || recognitionLanguage || null);
        }
      }
      
      // Enhanced auto-submit logic
      if (transcription.confidence >= 0.6 && transcription.transcript.trim().length > 3) {
        setTimeout(() => {
          handleSubmitWithText(transcription.transcript);
        }, 800);
      }
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      
      let errorMessage = 'Error transcribing audio. Please type your question instead.';
      
      if (err.message.includes('language') || err.message.includes('not supported')) {
        errorMessage = `Language support issue: ${err.message}. Please try typing instead or switch to a supported language.`;
      } else if (err.message.includes('permission') || err.message.includes('microphone')) {
        errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser settings and try again.';
      } else if (err.message.includes('network') || err.message.includes('offline')) {
        errorMessage = 'Network issue. Please check your internet connection and try again.';
      }
      
      setInput(errorMessage);
    } finally {
      setIsUsingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    await handleSubmitWithText(input.trim());
    setInput('');
    setInputRows(1);
  };

  const handleSubmitWithText = async (text: string) => {
    const derivedContext = {
      route: location.pathname,
      params,
      userRole: user?.role,
      userId: user?.id,
      language: i18n.language,
      // prefer explicit selection, then detection
      detectedLanguage: selectedLanguage || detectedLanguage || undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
    
    const finalContext = context ? { ...derivedContext, ...context } : derivedContext;
    await askQuestion(text, finalContext);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setInput('');
      // set the detected language to the user's selection so transcription uses it
      setDetectedLanguage(selectedLanguage || null);
      setShowLanguageWarning(false);
      
      try {
        await startRecording();
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  };

  // Expose imperative handle for quick questions
  useImperativeHandle(ref, () => ({
    askQuickQuestion: (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isProcessing) return;
      // Fire-and-forget; we don't need to await here
      void handleSubmitWithText(trimmed);
    }
  }));

  // Enhanced timestamp formatting
  const formatTimestamp = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  // Enhanced performance monitoring
  const calculateResponseTime = useCallback((messages: Message[]) => {
    if (messages.length < 2) return null;
    
    const userMessages = messages.filter(msg => msg.role === 'user');
    const aiMessages = messages.filter(msg => msg.role === 'assistant');
    
    if (userMessages.length > 0 && aiMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      
      if (lastAiMessage.timestamp > lastUserMessage.timestamp) {
        const timeDiff = lastAiMessage.timestamp.getTime() - lastUserMessage.timestamp.getTime();
        return Math.round(timeDiff / 1000);
      }
    }
    
    return null;
  }, []);

  // Enhanced performance metrics
  const getPerformanceMetrics = useCallback((messages: Message[]) => {
    const lastAiMessage = messages.filter(msg => msg.role === 'assistant').pop();
    return lastAiMessage?.metadata?.performanceMetrics || null;
  }, []);

  // Enhanced faith alignment data
  const getFaithAlignment = useCallback((messages: Message[]) => {
    const lastAiMessage = messages.filter(msg => msg.role === 'assistant').pop();
    return lastAiMessage?.metadata?.faithAlignment || null;
  }, []);

  const responseTime = calculateResponseTime(messages);
  const performanceMetrics = getPerformanceMetrics(messages);
  const faithAlignment = getFaithAlignment(messages);

  // Enhanced vague input detection
  const isVague = useCallback((text: string) => {
    if (!text) return false;
    
    const trimmed = text.trim();
    if (trimmed.length < 8) return true;
    
    const vaguePatterns = [
      /^help\b/i,
      /^explain\b/i,
      /^what\b/i,
      /^why\b/i,
      /^how\b/i,
      /^tell me about\b/i,
      /^i don'?t know\b/i,
      /^idk\b/i
    ];
    
    return vaguePatterns.some(pattern => pattern.test(trimmed));
  }, []);

  // Enhanced recording time formatting
  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Enhanced reporting function
  const reportQuestion = async (message: Message) => {
    if (!window.confirm(t('ai.confirmEscalate', 'Are you sure you want to escalate this question to moderators?'))) {
      return;
    }

    try {
      const userMessage = messages.find((m: Message) => 
        m.role === 'user' && m.id === message.id.replace('ai-', 'user-')
      );

      // Create report data
      const reportData = {
        question: userMessage?.content || '',
        sessionId: sessionId,
        context: { 
          route: location.pathname, 
          params, 
          userRole: user?.role, 
          userId: user?.id, 
          language: i18n.language 
        },
        moderation: message.metadata?.moderation
      };

      // Send report to backend for moderation workflow
      await aiApi.reportQuestion(reportData);
      
      // Show success feedback
      setTimeout(() => {
        alert(t('ai.escalated', 'Question escalated to moderators. Thank you for helping maintain doctrinal accuracy.'));
      }, 100);
      
    } catch (e) {
      console.error('Escalation failed:', e);
      alert(t('ai.escalateFailed', 'Failed to escalate question. Please try again later.'));
    }
  };

  // Enhanced feedback submission
  const submitFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setUserFeedback(prev => ({ ...prev, [messageId]: feedback }));
    
    try {
      // In a real implementation, this would call an API
      console.log('Submitting feedback:', { messageId, feedback, sessionId });
      
      // Show temporary confirmation
      setTimeout(() => {
        // Could show a toast notification here
      }, 100);
    } catch (error) {
      console.error('Feedback submission failed:', error);
      // Revert feedback on error
      setUserFeedback(prev => ({ ...prev, [messageId]: undefined as any }));
    }
  };

  // Enhanced message rendering with better error handling
  const renderMessageContent = (message: Message) => {
    if (message.metadata?.isError) {
      return (
        <div className="text-red-600 italic">
          {message.content}
        </div>
      );
    }
    
    return (
      <div className="whitespace-pre-wrap">{message.content}</div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`} style={{ maxHeight }}>
      {/* Enhanced Header - Landing Page Friendly */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-xl shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">AI Assistant</h3>
            <p className="text-sm text-gray-600">Questions about the platform?</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Faith Alignment Indicator */}
          {faithAlignment && (
            <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${
              faithAlignment.score >= 0.8 
                ? 'text-green-700 bg-green-50 border-green-200' 
                : faithAlignment.score >= 0.6 
                  ? 'text-yellow-700 bg-yellow-50 border-yellow-200' 
                  : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {Math.round(faithAlignment.score * 100)}% Aligned
            </div>
          )}

          {/* Language Selector */}
          <div className="flex items-center">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#27AE60] mr-2"
              title="Select response / transcription language"
            >
              {Object.entries(speechToText.supportedLanguages).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Response Time Indicator */}
          {responseTime !== null && responseTime < 3 && (
            <div className="flex items-center text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              {t('ai.responseTime', '{{seconds}}s', { seconds: responseTime })}
            </div>
          )}

          {/* Slow Response Warning */}
          {isSlowResponse && (
            <div className="flex items-center text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('ai.slowResponse', 'Taking longer')}
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={clearConversation}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-150 hover:shadow-sm"
            title={t('ai.clearConversation', 'Clear conversation')}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-150 hover:shadow-sm"
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-25 to-gray-50"
        style={{ maxHeight: `calc(${maxHeight} - 140px)` }}
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="p-4 bg-gradient-to-r from-[#27AE60]/20 to-[#16A085]/20 rounded-2xl inline-block mb-4">
              <Bot className="h-12 w-12 text-[#27AE60]" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">👋 Welcome to EOTY AI Assistant</h4>
            <p className="text-gray-600 max-w-md mx-auto mb-6 text-sm leading-relaxed">
              I'm here to help you understand the platform, answer questions about Ethiopian Orthodox teachings,
              and guide you through your spiritual learning journey.
            </p>

            {/* Quick Start Suggestions */}
            <div className="bg-gradient-to-r from-[#27AE60]/5 to-[#16A085]/5 rounded-xl p-4 mb-6 border border-[#27AE60]/20">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-2 text-[#27AE60]" />
                Try asking me about:
              </h5>
              <div className="grid grid-cols-1 gap-2 text-sm max-w-sm mx-auto">
                <button
                  onClick={() => setInput('How do I get started with learning on this platform?')}
                  className="p-3 bg-white hover:bg-[#27AE60]/5 rounded-lg border border-gray-200 hover:border-[#27AE60]/30 shadow-sm transition-all text-left group cursor-pointer"
                >
                  <span className="font-medium text-[#27AE60]">🚀</span> How do I get started with learning?
                </button>
                <button
                  onClick={() => setInput('What courses are available for Ethiopian Orthodox teachings?')}
                  className="p-3 bg-white hover:bg-[#27AE60]/5 rounded-lg border border-gray-200 hover:border-[#27AE60]/30 shadow-sm transition-all text-left group cursor-pointer"
                >
                  <span className="font-medium text-[#27AE60]">📚</span> What courses are available?
                </button>
                <button
                  onClick={() => setInput('How does the AI assistant help with learning?')}
                  className="p-3 bg-white hover:bg-[#27AE60]/5 rounded-lg border border-gray-200 hover:border-[#27AE60]/30 shadow-sm transition-all text-left group cursor-pointer"
                >
                  <span className="font-medium text-[#27AE60]">🤖</span> How does AI assistance work?
                </button>
              </div>
          </div>
        

        {/* Language Warning */}
        {showLanguageWarning && (
          <div className="flex justify-center">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 max-w-md w-full">
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Voice input switched to {speechToText.getLanguageDisplayName(detectedLanguage || 'en-US')} for better accuracy</span>
              </div>
            </div>
          </div>
        )}

        {/* Guidance when input is vague */}
        {isVague(input) && !isProcessing && (
          <div className="flex justify-center">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 max-w-md w-full">
              <div className="flex items-start">
                <MessageCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('ai.vagueGuidance', 'For better results, add details. Example: "Explain the significance of fasting during [season]" or "How does this chapter relate to [topic]?"')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex space-x-3 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
              message.role === 'user' 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              {message.role === 'user' ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-[85%] ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              } ${message.status === 'error' ? 'border-red-200 bg-red-50' : ''}`}>
                {renderMessageContent(message)}
                
                {/* Enhanced Moderation Warning */}
                {message.role === 'assistant' && message.metadata?.moderation?.needsModeration && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-yellow-800">
                        <div className="font-semibold mb-1">Content Review Notice</div>
                        <p className="mb-2">
                          This question has been flagged for moderator review to ensure doctrinal accuracy 
                          and alignment with Ethiopian Orthodox teachings.
                        </p>
                        
                        {/* Show specific moderation flags */}
                        {message.metadata.moderation.flags && message.metadata.moderation.flags.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium">Flags: </span>
                            {message.metadata.moderation.flags
                              .filter((flag: string) => !flag.includes('guidance_needed'))
                              .map((flag: string) => flag.replace(/_/g, ' '))
                              .join(', ')}
                          </div>
                        )}
                        
                        {/* Faith alignment score */}
                        {message.metadata.moderation.faithAlignmentScore !== undefined && (
                          <div className="mb-3">
                            <span className="font-medium">Faith Alignment: </span>
                            <span className={
                              message.metadata.moderation.faithAlignmentScore >= 0.8 
                                ? 'text-green-600' 
                                : message.metadata.moderation.faithAlignmentScore >= 0.6 
                                  ? 'text-yellow-600' 
                                  : 'text-red-600'
                            }>
                              {Math.round(message.metadata.moderation.faithAlignmentScore * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => reportQuestion(message)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-all duration-150 shadow-sm"
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {t('ai.escalate', 'Escalate to Moderators')}
                        </button>
                        
                        <button
                          onClick={() => {
                            const guidance = "For doctrinal questions, try being more specific about Ethiopian Orthodox teachings. Example: 'What does the Ethiopian Orthodox Church teach about...'";
                            setInput(guidance);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all duration-150 shadow-sm"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Get Rephrasing Help
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Guidance Message */}
                {message.role === 'assistant' && message.metadata?.guidance && message.metadata.guidance.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
                    <Bot className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <strong>Helpful Tip:</strong> {message.metadata.guidance[0]}
                    </div>
                  </div>
                )}

                {/* Enhanced Relevant Sources */}
                {message.role === 'assistant' && message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                      <BookOpen className="h-3 w-3" />
                      <span>Based on:</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {message.metadata.sources.slice(0, 2).map((source: string, index: number) => (
                        <div key={index}>• {source}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Related Resources */}
                {message.role === 'assistant' && message.metadata?.relatedResources && message.metadata.relatedResources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                      <FileText className="h-3 w-3" />
                      <span>Related Resources:</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {message.metadata.relatedResources.slice(0, 3).map((resource: any, index: number) => (
                        <div key={index} className="flex items-start">
                          <FileText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{resource.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Language Information */}
                {message.role === 'assistant' && message.detectedLanguage && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Globe className="h-3 w-3" />
                      <span>Response in {speechToText.getLanguageDisplayName(message.detectedLanguage)}</span>
                    </div>
                  </div>
                )}

                {/* Enhanced Feedback Buttons for AI Messages */}
                {message.role === 'assistant' && !message.metadata?.isError && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {t('ai.wasThisHelpful', 'Was this helpful?')}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => submitFeedback(message.id, 'positive')}
                        className={`p-1 rounded transition-all duration-150 ${
                          userFeedback[message.id] === 'positive' 
                            ? 'text-green-600 bg-green-50' 
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={t('ai.helpful', 'Helpful')}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => submitFeedback(message.id, 'negative')}
                        className={`p-1 rounded transition-all duration-150 ${
                          userFeedback[message.id] === 'negative' 
                            ? 'text-red-600 bg-red-50' 
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={t('ai.notHelpful', 'Not helpful')}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Enhanced Timestamp */}
              <div className={`text-xs text-gray-500 mt-1 flex items-center ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                {message.status === 'sending' && (
                  <Loader className="h-3 w-3 animate-spin mr-1" />
                )}
                {message.status === 'error' && (
                  <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Enhanced Processing Indicator */}
        {isProcessing && (
          <div className="flex space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#27AE60] to-[#16A085] flex items-center justify-center shadow-sm">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 max-w-[85%]">
              <div className="inline-block px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>{t('ai.thinking', 'Thinking...')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Audio Recording Indicator */}
        {isRecording && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md w-full shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-red-800">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <div>
                    <span className="font-medium">Recording... {formatRecordingTime(recordingTime)}</span>
                    <p className="text-xs text-red-600 mt-1">Click stop when finished</p>
                  </div>
                </div>
                <Volume2 className="h-5 w-5 text-red-600" />
              </div>
              {detectedLanguage && (
                <div className="text-xs text-red-600 mt-2 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  {speechToText.getLanguageDisplayName(detectedLanguage)}
                </div>
              )}
              {audioQuality && (
                <div className="text-xs text-red-500 mt-1">
                  Quality: {audioQuality.sampleRate/1000}kHz, {audioQuality.bitDepth}bit
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Audio Transcription Indicator */}
        {isUsingAudio && (
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 max-w-md w-full shadow-sm">
              <div className="flex items-center space-x-2 text-blue-800">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Transcribing audio...</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Messages */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-w-md w-full shadow-sm">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
              <div className="flex justify-center mt-2">
                <button
                  onClick={retryLastQuestion}
                  className="inline-flex items-center px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-150"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {t('ai.retry', 'Retry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {audioError && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-w-md w-full shadow-sm">
              <div className="flex items-center space-x-2 text-red-800">
                <VolumeX className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{audioError}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
)}
      {/* Enhanced Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about the platform, courses, or Ethiopian Orthodox teachings..."
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] transition-all duration-200 shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
              rows={inputRows}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isRecording || isProcessing}
              maxLength={500}
            />
            
            {/* Enhanced Audio Recording Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isProcessing || isUsingAudio}
              className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition-all duration-150 shadow-sm ${
                isRecording 
                  ? 'text-white bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100`}
              title={isRecording ? t('ai.stopRecording', 'Stop recording') : t('ai.startRecording', 'Start voice recording')}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            
            {/* Enhanced Character Count */}
            <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${
              input.length > 450 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {input.length}/500
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || isRecording || isUsingAudio}
            className="px-4 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-xl hover:from-[#16A085] hover:to-[#27AE60] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center min-w-[60px]"
          >
            {isProcessing ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        
        {/* Enhanced Browser Support Information */}
        <div className="mt-3 flex flex-col items-center space-y-2">
          {!speechToText.isBrowserSupported() && (
            <div className="text-xs text-yellow-600 text-center bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-200">
              Voice recording available but transcription limited in this browser. For better voice support, use Chrome or Edge.
            </div>
          )}
          
          {/* Enhanced Language Support Information */}
          <div className="text-xs text-gray-500 text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-1">
              {Object.entries(speechToText.supportedLanguages).map(([code, name]) => (
                <span key={code} className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  {name}
                </span>
              ))}
            </div>
            <div className="text-gray-400">
              Supported in Chrome, Edge, and Safari
            </div>
          </div>
          </div>
        </div>
      </div>
      </div>
   
  );
});

AIChatInterface.displayName = 'AIChatInterface';

export default AIChatInterface;
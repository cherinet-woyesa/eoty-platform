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
import { brandColors } from '@/theme/brand';

export interface AIChatInterfaceProps {
  context?: any;
  onClose?: () => void;
  className?: string;
  maxHeight?: string;
  onError?: (message: string) => void;
  onSlow?: (isSlow: boolean) => void;
  onMessageCountChange?: (count: number) => void;
  showWelcomeMessage?: boolean;
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
    maxHeight = '600px',
    onError,
    onSlow,
    onMessageCountChange,
    showWelcomeMessage = true
  }, ref) => {
  const [input, setInput] = useState<string>('');
  const [isUsingAudio, setIsUsingAudio] = useState<boolean>(false);
  const [isSlowResponse, setIsSlowResponse] = useState<boolean>(false);
  const [showLanguageWarning, setShowLanguageWarning] = useState<boolean>(false);
  const [inputRows, setInputRows] = useState<number>(1);
  const [userFeedback, setUserFeedback] = useState<{ [key: string]: 'positive' | 'negative' }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const [localError, setLocalError] = useState<string>('');
  const normalizeError = useCallback((err: string) => {
    if (!err) return '';
    const lower = err.toLowerCase();
    if (lower.includes('response time exceeded') || lower.includes('timeout')) {
      return t('ai.timeout', 'Response is taking too long. Please retry or shorten your question.');
    }
    if (lower.includes('accuracy')) {
      return t('ai.accuracy_error', 'Could not meet accuracy requirements. Please rephrase or add detail.');
    }
    return err;
  }, [t]);

  const reportError = useCallback((message: string) => {
    setLocalError(message);
  }, []);

  const clearErrors = useCallback(() => {
    setLocalError('');
    if (onError) onError('');
  }, [onError]);
  
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
    startRecording,
    stopRecording,
    error: audioError,
    detectedLanguage,
    setDetectedLanguage,
    recordingTime,
    audioQuality
  } = useAudioRecorder();

  // Helper to normalize language codes
  const normalizeLanguageCode = (lang: string | undefined | null): string | undefined => {
    if (!lang) return undefined;
    const map: Record<string, string> = {
      'en': 'en-US',
      'am': 'am-ET',
      'ti': 'ti-ET',
      'om': 'om-ET'
    };
    return map[lang] || lang;
  };

  // UI-controlled language selection (overrides automatic detection when set)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    detectedLanguage || normalizeLanguageCode(i18n.language) || speechToText.getUserLanguage() || 'en-US'
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

  const handleFileUpload = async (file: File | null | undefined) => {
    if (!file) return;
    const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg'];
    const isSupported = supportedTypes.includes(file.type) || file.type.startsWith('audio/');
    if (!isSupported) {
      reportError(t('ai.audio_format', 'Unsupported audio format. Please use mp4/wav/ogg or switch browser.'));
      return;
    }
    const qualityCheck = speechToText.validateAudioQuality(file);
    if (!qualityCheck.valid) {
      const issuesText = qualityCheck.issues.join(', ');
      const isFormatIssue = qualityCheck.issues.some((i: string) => i.toLowerCase().includes('unsupported audio format'));
      const qualityMessage = isFormatIssue
        ? t('ai.audio_format', 'Unsupported audio format. Please use mp4/wav/ogg or switch browser.')
        : t('ai.audio_quality_issue', 'Audio quality issue: {{issues}}. Please try again in a quieter environment.', { issues: issuesText });
      reportError(qualityMessage);
      return;
    }

    try {
      const transcription = await speechToText.transcribeWithCloudService(file, selectedLanguage || 'en-US');
      setInput(transcription.transcript);
      setDetectedLanguage(transcription.language || selectedLanguage || null);
      if (transcription.isFallback) {
        setShowLanguageWarning(true);
        setTimeout(() => setShowLanguageWarning(false), 5000);
      }
    } catch (err: any) {
      console.error('Audio upload transcribe failed', err);
      reportError(t('ai.audio_upload_error', 'Could not process the audio. Please try again or use text.'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  // Notify parent about message count
  useEffect(() => {
    if (onMessageCountChange) {
      onMessageCountChange(messages.length);
    }
  }, [messages.length, onMessageCountChange]);

  // Notify parent about errors
  useEffect(() => {
    const combined = error || localError;
    const friendly = normalizeError(combined ? `${t('ai.error_heading', 'AI assistant is experiencing issues.')} ${combined}` : '');
    if (onError) {
      onError(friendly);
    }
  }, [error, localError, normalizeError, onError, t]);

  // Notify parent about slow state
  useEffect(() => {
    if (onSlow) {
      onSlow(isSlowResponse);
    }
  }, [isSlowResponse, onSlow]);

  // Keep UI language in sync with explicit chat language selection
  useEffect(() => {
    const nextLang = selectedLanguage?.startsWith('am') ? 'am' : 'en';
    if (i18n.language !== nextLang) {
      void i18n.changeLanguage(nextLang);
    }
  }, [selectedLanguage, i18n]);

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsUsingAudio(true);
    try {
      // Enhanced audio quality validation
      const qualityCheck = speechToText.validateAudioQuality(audioBlob);
      if (!qualityCheck.valid) {
        // Provide concise, user-friendly message
        const issuesText = qualityCheck.issues.join(', ');
        const isFormatIssue = qualityCheck.issues.some((i: string) => i.toLowerCase().includes('unsupported audio format'));
        const qualityMessage = isFormatIssue
          ? t('ai.audio_format', 'Unsupported audio format. Please use mp4/wav/ogg or switch browser.')
          : t('ai.audio_quality_issue', 'Audio quality issue: {{issues}}. Please try again in a quieter environment.', { issues: issuesText });
        setInput(qualityMessage);
        setIsUsingAudio(false);
        return;
      }

      let transcription: TranscriptionResult;
      const browserSupport = speechToText.getBrowserCompatibility();

      // Prefer explicit user-selected language when available, otherwise use detectedLanguage
      const recognitionLanguage = selectedLanguage || detectedLanguage || undefined;

      // Always use cloud transcription service since we have a recorded blob.
      // Browser native SpeechRecognition cannot transcribe a pre-recorded blob; 
      // it only works with live microphone input.
      transcription = await speechToText.transcribeWithCloudService(audioBlob, recognitionLanguage || 'en-US');
      
      // Seamless flow: Don't show transcript in input, just submit immediately
      if (transcription.transcript && transcription.transcript.trim().length > 0) {
        // Update detected language state for UI reference
        setDetectedLanguage(transcription.language || recognitionLanguage || null);
        
        // Submit directly with the detected language
        await handleSubmitWithText(transcription.transcript, transcription.language || recognitionLanguage || undefined);
      } else {
        // Handle silence or empty transcript
        reportError(t('ai.no_speech', 'No speech detected. Please try again.'));
      }

      if (transcription.isFallback) {
        setShowLanguageWarning(true);
        setTimeout(() => setShowLanguageWarning(false), 5000);
      }
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      
      let errorMessage = t('ai.audio_upload_error', 'Could not process the audio. Please try again or use text.');
      
      if (err.message.includes('language') || err.message.includes('not supported')) {
        errorMessage = t('ai.audio_language_issue', 'Language support issue: {{message}}. Try typing instead or switch to a supported language.', { message: err.message });
      } else if (err.message.includes('permission') || err.message.includes('microphone')) {
        errorMessage = t('ai.audio_permission_error', 'Microphone access denied. Allow mic permissions in your browser and try again.');
      } else if (err.message.includes('network') || err.message.includes('offline')) {
        errorMessage = t('ai.audio_network_error', 'Network issue. Please check your internet connection and try again.');
      }
      
      reportError(errorMessage);
      setInput('');
    } finally {
      setIsUsingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    clearErrors();
    await handleSubmitWithText(input.trim());
    setInput('');
    setInputRows(1);
  };

  const handleSubmitWithText = async (text: string, languageOverride?: string) => {
    const derivedContext = {
      route: location.pathname,
      params,
      userRole: user?.role,
      userId: user?.id,
      language: i18n.language,
      // prefer explicit selection, then override, then detection
      detectedLanguage: selectedLanguage || languageOverride || detectedLanguage || undefined,
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

  // Enhanced faith alignment data
  const getFaithAlignment = useCallback((messages: Message[]) => {
    const lastAiMessage = messages.filter(msg => msg.role === 'assistant').pop();
    return lastAiMessage?.metadata?.faithAlignment || null;
  }, []);

  const responseTime = calculateResponseTime(messages);
  const faithAlignment = getFaithAlignment(messages);
  const combinedError = error || localError;
  const displayError = normalizeError(combinedError || '');

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

  const statusVariant = (() => {
    if (error) return { label: t('ai.status.degraded', 'Degraded'), color: 'text-red-700 bg-red-50 border-red-200' };
    if (isProcessing) return { label: t('ai.status.responding', 'Responding'), color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: t('ai.status.ready', 'Ready'), color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
  })();

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`} style={{ maxHeight }}>
      {/* Enhanced Header - Landing Page Friendly */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-200 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${brandColors.primaryHex}14, ${brandColors.primaryHoverHex}14)` }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="p-2 rounded-xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
          >
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{t('ai_assistant.title')}</h3>
            <p className="text-sm text-gray-600">{t('ai.header_subtitle', 'Questions about the platform?')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Status badge */}
          <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${statusVariant.color}`}>
            <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-80" />
            {statusVariant.label}
          </div>

          {/* Faith Alignment Indicator */}
          {faithAlignment && (
            <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${
              faithAlignment.score >= 0.8 
                ? 'text-indigo-800 bg-indigo-50 border-indigo-100' 
                : faithAlignment.score >= 0.6 
                  ? 'text-amber-700 bg-amber-50 border-amber-200' 
                  : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('ai.faith_alignment', '{{score}}% aligned', { score: Math.round(faithAlignment.score * 100) })}
            </div>
          )}

          {/* Language Selector */}
          <div className="flex items-center">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[color:#1e1b4b] mr-2"
            title={t('ai.language_select', 'Select response / transcription language')}
          >
            <option value="en-US">{t('ai.language_en', 'English (US)')}</option>
            <option value="am-ET">{t('ai.language_am', 'Amharic (Ethiopia)')}</option>
            <option value="ti-ET">Tigrigna</option>
            <option value="om-ET">Afan Oromo</option>
          </select>
          </div>

          {/* Response Time Indicator */}
          {responseTime !== null && responseTime < 3 && (
            <div className="flex items-center text-xs text-[color:#1e1b4b] bg-[color:rgba(30,27,75,0.08)] border border-[color:rgba(30,27,75,0.18)] px-2 py-1 rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              {t('ai.responseTime', '{{seconds}}s', { seconds: responseTime })}
            </div>
          )}

          {/* Slow Response Warning */}
          {isSlowResponse && (
            <div className="flex items-center text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('ai.slowResponse', 'Taking longer than usual...')}
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={() => { clearErrors(); clearConversation(); }}
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
        {displayError && (
          <div className="flex justify-center">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 max-w-xl w-full flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{t('ai.error_heading', 'AI assistant is experiencing issues.')}</p>
                <p className="text-red-700/80">{displayError}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => retryLastQuestion()}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:brightness-110"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    {t('ai.retry_last', 'Retry last question')}
                  </button>
                  <button
                    onClick={() => clearConversation()}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    {t('ai.clearConversation', 'Clear conversation')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && showWelcomeMessage && (
          <div className="text-center py-6">
            <div className="p-3 rounded-2xl inline-block mb-3" style={{ background: `${brandColors.primaryHex}1A` }}>
              <Bot className="h-10 w-10" style={{ color: brandColors.primaryHex }} />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">👋 {t('ai.welcome_title', 'Welcome to EOTY AI Assistant')}</h4>
            <p className="text-gray-600 max-w-sm mx-auto mb-4 text-sm leading-relaxed">
              {t('ai.welcome_body_short', 'Ask faith or platform questions; I’ll keep answers brief and aligned.')}
            </p>

            {/* Quick Start Suggestions as chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {[t('ai.quickstart_1', 'How do I get started with learning?'), t('ai.quickstart_2', 'What courses are available?'), t('ai.quickstart_3', 'How does AI assistance work?')].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-full hover:border-[color:rgba(30,27,75,0.4)] hover:bg-[color:rgba(30,27,75,0.05)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        

        {/* Language Warning */}
        {showLanguageWarning && (
          <div className="flex justify-center">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 max-w-md w-full">
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{t('ai.voice_switched', 'Voice input switched to {{language}} for better accuracy', { language: speechToText.getLanguageDisplayName(detectedLanguage || 'en-US') })}</span>
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
                        <div className="font-semibold mb-1">{t('ai.moderation.notice_title', 'Content Review Notice')}</div>
                        <p className="mb-2">
                          {t('ai.moderation.notice_body', 'This question was flagged for moderator review to ensure doctrinal accuracy and alignment with Ethiopian Orthodox teachings.')}
                        </p>
                        
                        {/* Show specific moderation flags */}
                        {message.metadata.moderation.flags && message.metadata.moderation.flags.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium">{t('ai.moderation.flags_label', 'Flags: ')} </span>
                            {message.metadata.moderation.flags
                              .filter((flag: string) => !flag.includes('guidance_needed'))
                              .map((flag: string) => flag.replace(/_/g, ' '))
                              .join(', ')}
                          </div>
                        )}
                        
                        {/* Faith alignment score */}
                        {message.metadata.moderation.faithAlignmentScore !== undefined && (
                          <div className="mb-3">
                            <span className="font-medium">{t('ai.moderation.faith_alignment', 'Faith Alignment: ')} </span>
                            <span className={
                              message.metadata.moderation.faithAlignmentScore >= 0.8 
                                ? 'text-indigo-700' 
                                : message.metadata.moderation.faithAlignmentScore >= 0.6 
                                  ? 'text-amber-700' 
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
                            const guidance = t('ai.moderation.rephrase_suggestion', "For doctrinal questions, be specific about Ethiopian Orthodox teachings. Example: 'What does the Ethiopian Orthodox Church teach about...'");
                            setInput(guidance);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all duration-150 shadow-sm"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          {t('ai.moderation.rephrase_help', 'Get Rephrasing Help')}
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
                      <strong>{t('ai.helpful_tip', 'Helpful Tip:')}</strong> {message.metadata.guidance[0]}
                    </div>
                  </div>
                )}

                {/* Enhanced Relevant Sources */}
                {message.role === 'assistant' && message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                      <BookOpen className="h-3 w-3" />
                      <span>{t('ai.sources_based_on', 'Based on:')}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {message.metadata.sources.slice(0, 2).map((source: any, index: number) => {
                        const label = typeof source === 'string' ? source : source?.title || source?.url || t('ai.sources_generic', 'Source');
                        const url = typeof source === 'object' ? source?.url : undefined;
                        return (
                          <div key={index} className="flex items-center gap-1">
                            <span>•</span>
                            {url ? (
                              <a href={url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                                {label}
                              </a>
                            ) : (
                              <span>{label}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Related Resources */}
                {message.role === 'assistant' && message.metadata?.relatedResources && message.metadata.relatedResources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                      <FileText className="h-3 w-3" />
                      <span>{t('ai.related_resources', 'Related Resources:')}</span>
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
                      <span>{t('ai.response_language', 'Response in {{language}}', { language: speechToText.getLanguageDisplayName(message.detectedLanguage) })}</span>
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
                            ? 'text-indigo-700 bg-indigo-50' 
                            : 'text-gray-400 hover:text-indigo-700 hover:bg-indigo-50'
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

        {/* Inline skeleton while processing */}
        {isProcessing && (
          <div className="flex space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse" />
              <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {/* Enhanced Processing Indicator */}
        {isProcessing && (
          <div className="flex space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[color:#1e1b4b] to-[color:#312e81] flex items-center justify-center shadow-sm">
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



        {/* Enhanced Audio Transcription Indicator */}
        {isUsingAudio && (
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 max-w-md w-full shadow-sm">
              <div className="flex items-center space-x-2 text-blue-800">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{t('ai.transcribing', 'Transcribing audio...')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Messages */}
        {displayError && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-w-md w-full shadow-sm">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{displayError}</span>
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

      {/* Enhanced Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            {isRecording && (
              <div className="absolute inset-0 z-20 flex items-center justify-between px-4 bg-gray-50/95 rounded-xl backdrop-blur-sm border border-red-100">
                <div className="flex items-center gap-3 text-red-600 font-medium">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span>{t('ai.recording', 'Recording...')} {formatRecordingTime(recordingTime)}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <div className="w-3 h-3 bg-red-600 rounded-sm" />
                  {t('ai.stop', 'Stop')}
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('ai.placeholder', 'Ask about the platform, courses, or Ethiopian Orthodox teachings...')}
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-[color:#1e1b4b] transition-all duration-200 shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
              rows={inputRows}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isRecording || isProcessing}
              maxLength={500}
            />
            
            {/* Upload audio file */}
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUsingAudio}
              className="absolute right-24 top-1/2 transform -translate-y-1/2 p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-sm transition-all duration-150 disabled:opacity-50"
              title={t('ai.upload_audio', 'Upload audio file')}
            >
              <FileText className="h-4 w-4" />
            </button>

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
            className="px-4 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center min-w-[60px]"
            style={{ background: `linear-gradient(120deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
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
              {t('ai.browser_limit', 'Voice recording available but transcription is limited in this browser. For better voice support, use Chrome or Edge.')}
            </div>
          )}
          
          {/* Enhanced Language Support Information */}
          <div className="text-xs text-gray-500 text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-1">
              {[
                t('ai.language_en', 'English (US)'),
                t('ai.language_am', 'Amharic (Ethiopia)'),
                t('ai.language_ti', 'Tigrigna (Ethiopia)'),
                t('ai.language_om', 'Oromo (Ethiopia)')
              ].map((label, idx) => (
                <span key={idx} className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
                  <CheckCircle className="h-3 w-3 text-[color:#1e1b4b] mr-1" />
                  {label}
                </span>
              ))}
            </div>
            <div className="text-gray-400">
              {t('ai.languages_supported', 'Supported in Chrome, Edge, and Safari')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AIChatInterface.displayName = 'AIChatInterface';

export default AIChatInterface;
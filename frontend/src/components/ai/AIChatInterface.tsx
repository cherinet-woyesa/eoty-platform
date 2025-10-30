import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAIChat } from '../../hooks/useAIChat';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { speechToText } from '../../services/speechToText';
import { 
  Send, Bot, User, Trash2, AlertTriangle, 
  BookOpen, Loader, Mic, MicOff,
  Volume2, VolumeX, Globe, Clock, CheckCircle, FileText
} from 'lucide-react';
import { aiApi } from '../../services/api';

interface AIChatInterfaceProps {
  context?: any;
  onClose?: () => void;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ context, onClose }) => {
  const [input, setInput] = useState<string>('');
  const [isUsingAudio, setIsUsingAudio] = useState<boolean>(false);
  const [isSlowResponse, setIsSlowResponse] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  
  const {
    messages,
    isProcessing,
    error,
    askQuestion,
    clearConversation,
    loadConversationHistory
  } = useAIChat();

  const {
    isRecording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    error: audioError,
    detectedLanguage,
    setDetectedLanguage
  } = useAudioRecorder();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsUsingAudio(true);
    try {
      let transcription: string;
      let confidence: number = 0;
      
      // Try browser-native recognition first with language detection
      if (speechToText.isBrowserSupported()) {
        const result = await speechToText.startEnhancedBrowserRecognition();
        transcription = result.transcript;
        confidence = result.confidence;
        setDetectedLanguage(result.language);
        
        // Show confidence level to user
        if (confidence < 0.7) {
          setInput(`${transcription} (Low confidence - please verify)`);
        } else {
          setInput(transcription);
        }
      } else {
        // Fallback to placeholder
        transcription = await speechToText.transcribeAudio(audioBlob);
        setInput(transcription);
      }
      
      // Auto-submit after short delay
      setTimeout(() => {
        handleSubmitWithText(transcription);
      }, 300);
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      // Check if it's a language support issue
      if (err.message && err.message.includes('language')) {
        setInput('Unsupported language. Please try speaking in English or check your browser language settings.');
      } else {
        setInput('Error transcribing audio. Please type your question instead.');
      }
    } finally {
      setIsUsingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    await handleSubmitWithText(input.trim());
    setInput('');
  };

  const handleSubmitWithText = async (text: string) => {
    const derivedContext = {
      route: location.pathname,
      params,
      userRole: user?.role,
      userId: user?.id,
      language: i18n.language,
      detectedLanguage: detectedLanguage || undefined,
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
      setInput(''); // Clear input when starting recording
      setDetectedLanguage(null); // Reset language detection
      await startRecording();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate response time for performance monitoring
  const calculateResponseTime = (messages: any[]) => {
    if (messages.length < 2) return null;
    
    const lastUserMessage = messages[messages.length - 2];
    const lastAiMessage = messages[messages.length - 1];
    
    if (lastUserMessage.role === 'user' && lastAiMessage.role === 'assistant') {
      const timeDiff = lastAiMessage.timestamp.getTime() - lastUserMessage.timestamp.getTime();
      return Math.round(timeDiff / 1000); // in seconds
    }
    
    return null;
  };

  // Get detailed performance metrics
  const getPerformanceMetrics = (messages: any[]) => {
    if (messages.length < 2) return null;
    
    const lastAiMessage = messages[messages.length - 1];
    if (lastAiMessage.role === 'assistant' && lastAiMessage.metadata?.performanceMetrics) {
      return lastAiMessage.metadata.performanceMetrics;
    }
    
    return null;
  };

  const responseTime = calculateResponseTime(messages);
  const performanceMetrics = getPerformanceMetrics(messages);

  // Slow response detector (5s)
  useEffect(() => {
    let timer: any;
    if (isProcessing) {
      setIsSlowResponse(false);
      timer = setTimeout(() => setIsSlowResponse(true), 5000);
    } else {
      setIsSlowResponse(false);
    }
    return () => timer && clearTimeout(timer);
  }, [isProcessing]);

  // Heuristic for vague input
  const isVague = (text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    if (trimmed.length < 8) return true;
    const vagueTokens = ['help', 'explain', 'idk', 'don\'t know', 'what', 'why'];
    return vagueTokens.some(v => trimmed.toLowerCase() === v || trimmed.toLowerCase().startsWith(v + ' '));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{i18n.t('ai.headerTitle', 'Faith Assistant')}</h3>
            <p className="text-sm text-gray-600">{i18n.t('ai.headerSubtitle', 'Ask questions about Orthodox teachings')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {responseTime !== null && responseTime < 3 && (
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              {i18n.t('ai.responseTime', '{{seconds}}s response', { seconds: responseTime })}
            </div>
          )}
          {performanceMetrics && performanceMetrics.totalTimeMs && performanceMetrics.totalTimeMs < 3000 ? (
            <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <CheckCircle className="h-3 w-3 mr-1" />
              {performanceMetrics.totalTimeMs}ms
            </div>
          ) : performanceMetrics && performanceMetrics.totalTimeMs ? (
            <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {performanceMetrics.totalTimeMs}ms
            </div>
          ) : null}
          {isSlowResponse && (
            <div className="flex items-center text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {i18n.t('ai.slowResponse', 'Taking longer than usual')}
            </div>
          )}
          <button
            onClick={clearConversation}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors duration-150"
            title={i18n.t('ai.clearConversation', 'Clear conversation')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors duration-150"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{i18n.t('ai.welcomeTitle', 'Welcome to Faith Assistant')}</h4>
            <p className="text-gray-600 max-w-sm mx-auto">{i18n.t('ai.welcomeSubtitle', 'Ask me anything about Orthodox Christianity, church teachings, or your current lesson.')}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-500">
              <p>• {i18n.t('ai.example1', 'What is the significance of the Holy Trinity?')}</p>
              <p>• {i18n.t('ai.example2', 'Explain the Ethiopian Orthodox liturgy')}</p>
              <p>• {i18n.t('ai.example3', 'Help me understand this lesson about prayer')}</p>
            </div>
          </div>
        )}

        {/* Guidance when input is vague */}
        {isVague(input) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            {i18n.t('ai.vagueGuidance', 'For better results, add details. Example: "Explain the significance of fasting during [season]" or "How does this chapter relate to [topic]?"')}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex space-x-3 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
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
            <div className={`flex-1 max-w-[80%] ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              <div className={`inline-block px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {/* Moderation Warning */}
                {message.role === 'assistant' && message.metadata?.moderation?.needsModeration && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-sm text-yellow-800">
                      <div><strong>{i18n.t('ai.note', 'Note')}:</strong> {i18n.t('ai.flaggedMessage', 'This question has been flagged for moderator review to ensure doctrinal accuracy.')}</div>
                      <div className="mt-2">
                        <button
                          onClick={async () => {
                            try {
                              await aiApi.reportQuestion({
                                question: (messages.find(m => m.role === 'user')?.content) || '',
                                sessionId: message.id, // Assuming message.id is the sessionId
                                context: { route: location.pathname, params, userRole: user?.role, userId: user?.id, language: i18n.language },
                                moderation: message.metadata?.moderation
                              });
                              alert(i18n.t('ai.escalated', 'Escalated to moderators. Thank you.'));
                            } catch (e) {
                              alert(i18n.t('ai.escalateFailed', 'Failed to escalate. Please try again later.'));
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700"
                        >
                          {i18n.t('ai.escalate', 'Escalate to moderators')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guidance Message */}
                {message.role === 'assistant' && message.metadata?.guidance && message.metadata.guidance.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
                    <Bot className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <strong>Helpful Tip:</strong> {message.metadata.guidance[0]}
                    </div>
                  </div>
                )}

                {/* Relevant Sources */}
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
                
                {/* Related Resources */}
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
                
                {/* Language Information */}
                {message.role === 'assistant' && message.detectedLanguage && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Globe className="h-3 w-3" />
                      <span>Response in {speechToText.supportedLanguages[message.detectedLanguage as keyof typeof speechToText.supportedLanguages] || message.detectedLanguage}</span>
                    </div>
                  </div>
                )}

              </div>
              
              {/* Timestamp */}
              <div className={`text-xs text-gray-500 mt-1 ${
                message.role === 'user' ? 'text-right' : ''
              }`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 max-w-[80%]">
              <div className="inline-block px-4 py-2 rounded-2xl bg-white border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Recording Indicator */}
        {isRecording && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md">
              <div className="flex items-center space-x-3 text-red-800">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="font-medium">Recording... Click to stop</span>
                <Volume2 className="h-4 w-4" />
              </div>
              {detectedLanguage && (
                <div className="text-xs text-red-600 mt-1 flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  {speechToText.supportedLanguages[detectedLanguage as keyof typeof speechToText.supportedLanguages] || detectedLanguage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Transcription Indicator */}
        {isUsingAudio && (
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 max-w-md">
              <div className="flex items-center space-x-2 text-blue-800">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">Transcribing audio...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-w-md">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        {audioError && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-w-md">
              <div className="flex items-center space-x-2 text-red-800">
                <VolumeX className="h-4 w-4" />
                <span className="text-sm">{audioError}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Orthodox teachings, scripture, or your current lesson..."
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isRecording}
            />
            
            {/* Audio Recording Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isProcessing || isUsingAudio}
              className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-2 rounded-xl transition-all duration-150 ${
                isRecording 
                  ? 'text-white bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            
            {/* Character Count */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              {input.length}/500
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || isRecording || isUsingAudio}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center min-w-[60px]"
          >
            {isProcessing ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        
        {/* Browser Support Warning */}
        {!speechToText.isBrowserSupported() && (
          <div className="mt-2 text-xs text-yellow-600 text-center">
            Voice recording available but transcription limited in this browser. For better voice support, use Chrome or Edge.
          </div>
        )}
        
        {/* Enhanced Language Support Information */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              English
            </span>
            <span className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              Amharic
            </span>
            <span className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              Tigrigna
            </span>
            <span className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              Oromo
            </span>
            <span className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              Somali
            </span>
          </div>
          <div className="mt-1">
            Supported in Chrome, Edge, and Safari
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
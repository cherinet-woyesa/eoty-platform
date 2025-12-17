import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Type, X, Settings, Minus, Plus, AlignLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TeleprompterProps {
  isOpen: boolean;
  onClose: () => void;
}

const Teleprompter: React.FC<TeleprompterProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1); // 1-10
  const [fontSize, setFontSize] = useState(24); // px
  const [isEditing, setIsEditing] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved script from local storage
  useEffect(() => {
    const savedScript = localStorage.getItem('teleprompter_script');
    if (savedScript) {
      setText(savedScript);
    }
  }, []);

  // Save script to local storage
  useEffect(() => {
    localStorage.setItem('teleprompter_script', text);
  }, [text]);

  // Handle scrolling
  useEffect(() => {
    if (isPlaying && !isEditing) {
      scrollIntervalRef.current = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed * 0.5;
          
          // Stop if reached bottom
          if (
            scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >= 
            scrollContainerRef.current.scrollHeight - 5
          ) {
            setIsPlaying(false);
          }
        }
      }, 30);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isPlaying, scrollSpeed, isEditing]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-4 z-50 w-80 bg-black/80 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl flex flex-col text-white overflow-hidden transition-all duration-300 h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40 cursor-move">
        <div className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4 text-sky-400" />
          <span className="font-medium text-sm">{t('teleprompter.title', 'Teleprompter')}</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-black/20">
        {isEditing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('teleprompter.placeholder', 'Paste your script here...')}
            className="w-full h-full bg-transparent p-4 text-white/90 resize-none focus:outline-none text-sm font-mono"
            style={{ fontSize: '14px' }}
          />
        ) : (
          <div 
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto p-6 scroll-smooth no-scrollbar"
            style={{ scrollBehavior: 'auto' }}
          >
            {/* Padding top to start text in middle */}
            <div className="h-[40%]" />
            <p 
              className="text-white/95 leading-relaxed whitespace-pre-wrap transition-all duration-300"
              style={{ fontSize: `${fontSize}px` }}
            >
              {text || t('teleprompter.empty_preview', 'No script content')}
            </p>
            {/* Padding bottom to allow scrolling to end */}
            <div className="h-[80%]" />
            
            {/* Reading Guide Line */}
            <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 border-y border-sky-500/30 bg-sky-500/5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 bg-black/60 border-t border-white/10 space-y-3">
        {/* Mode Toggle & Play Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isEditing ? t('teleprompter.preview', 'Preview') : t('teleprompter.edit', 'Edit')}
          </button>

          {!isEditing && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-full ${isPlaying ? 'bg-red-500/80 hover:bg-red-600' : 'bg-sky-500/80 hover:bg-sky-600'} transition-colors`}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>
          )}
        </div>

        {/* Settings (Only visible in Preview/Play mode) */}
        {!isEditing && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            {/* Speed Control */}
            <div className="flex items-center gap-3">
              <Settings className="h-3 w-3 text-white/50" />
              <span className="text-[10px] text-white/50 w-8">{t('teleprompter.speed', 'Speed')}</span>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:rounded-full"
              />
              <span className="text-[10px] text-white/70 w-4 text-right">{scrollSpeed}x</span>
            </div>

            {/* Font Size Control */}
            <div className="flex items-center gap-3">
              <Type className="h-3 w-3 text-white/50" />
              <span className="text-[10px] text-white/50 w-8">{t('teleprompter.size', 'Size')}</span>
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => setFontSize(Math.max(16, fontSize - 2))} className="p-0.5 hover:text-sky-400"><Minus className="h-3 w-3" /></button>
                <div className="flex-1 h-1 bg-white/20 rounded-lg overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${((fontSize - 16) / 32) * 100}%` }} />
                </div>
                <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="p-0.5 hover:text-sky-400"><Plus className="h-3 w-3" /></button>
              </div>
              <span className="text-[10px] text-white/70 w-4 text-right">{fontSize}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teleprompter;

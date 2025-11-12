import * as React from 'react';

interface SubtitleDisplayProps {
  currentCue: string;
  visible: boolean;
}

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ currentCue, visible }) => {
  if (!visible || !currentCue) {
    return null;
  }

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4 z-20 pointer-events-none">
      <div className="bg-black/80 text-white px-4 py-2 rounded-lg max-w-3xl text-center">
        <p className="text-base leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {currentCue}
        </p>
      </div>
    </div>
  );
};

export default SubtitleDisplay;

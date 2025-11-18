/**
 * FR7: Chapters Page
 * REQUIREMENT: Multi-city/chapter membership
 */

import React from 'react';
import { Users, MapPin, Search } from 'lucide-react';
import ChapterSelection from '@/components/shared/chapters/ChapterSelection';

const ChaptersPage: React.FC = () => {
  return (
    <div className="w-full space-y-2 p-2">
      {/* Chapter Selection Component */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4 shadow-sm">
        <ChapterSelection
          onChapterSelected={(chapter) => {
            console.log('Chapter selected:', chapter);
            // Could show a success notification here
          }}
        />
      </div>

      {/* Compact Info Section */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#27AE60]" />
          About Multi-Chapter Membership
        </h2>
        <div className="space-y-2 text-stone-600 text-xs">
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-0.5">•</span>
            <span>You can join multiple chapters to connect with members in different cities or regions</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-0.5">•</span>
            <span>Set one chapter as your primary chapter for personalized content</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-0.5">•</span>
            <span>Each chapter may have different topics, events, and community activities</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-0.5">•</span>
            <span>You can leave a chapter at any time, but you must have at least one active chapter</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChaptersPage;


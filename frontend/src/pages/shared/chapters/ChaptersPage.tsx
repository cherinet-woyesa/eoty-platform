/**
 * FR7: Chapters Page
 * REQUIREMENT: Multi-city/chapter membership
 */

import React from 'react';
import { Users, MapPin, Search } from 'lucide-react';
import ChapterSelection from '@/components/shared/chapters/ChapterSelection';

const ChaptersPage: React.FC = () => {
  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-stone-800">Chapters</h1>
        </div>
        <p className="text-stone-600 font-medium">
          Join chapters in your city or region to connect with local members
        </p>
      </div>

      {/* Chapter Selection Component */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md">
        <ChapterSelection 
          onChapterSelected={(chapter) => {
            console.log('Chapter selected:', chapter);
            // Could show a success notification here
          }}
        />
      </div>

      {/* Info Section */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#27AE60]" />
          About Multi-Chapter Membership
        </h2>
        <div className="space-y-3 text-stone-600 text-sm">
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-1">•</span>
            <span>You can join multiple chapters to connect with members in different cities or regions</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-1">•</span>
            <span>Set one chapter as your primary chapter for personalized content</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-1">•</span>
            <span>Each chapter may have different topics, events, and community activities</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-[#27AE60] mt-1">•</span>
            <span>You can leave a chapter at any time, but you must have at least one active chapter</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChaptersPage;


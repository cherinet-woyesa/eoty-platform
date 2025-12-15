import { Play, Clock, ArrowRight, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { forwardRef, useMemo, useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

interface VideoSectionProps {
  landingContent: any;
}

const VideoSection = forwardRef<HTMLElement, VideoSectionProps>(({ landingContent }, ref) => {
  const { t } = useTranslation();
  const videos = landingContent.videos || [];
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <section ref={ref} id="video-section" data-section-id="video-section" className="py-20 relative overflow-hidden bg-[#fdfbf7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium mb-4"
              style={{ backgroundColor: `${brandColors.primaryHex}14`, color: brandColors.primaryHex }}>
              <Play className="w-4 h-4" />
              <span>{t('landing.videos.badge')}</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('landing.videos.title')}{' '}
              <span style={{ color: brandColors.primaryHex }}>{t('landing.videos.title_accent')}</span>
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.videos.subtitle')}
            </p>
          </div>
          
          <Link 
            to="/resources?type=video" 
            className="group inline-flex items-center font-semibold transition-colors"
            style={{ color: brandColors.primaryHex }}
          >
            {t('landing.videos.view_all')}
            <ArrowRight className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video: any, index: number) => (
            <div 
              key={index} 
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              {/* Thumbnail Container or Video Player */}
              <div className="relative aspect-video overflow-hidden bg-gray-900">
                {playingVideoIndex === index ? (
                  <div className="w-full h-full">
                    {(video.videoUrl?.includes('youtube') || video.videoUrl?.includes('youtu.be')) ? (
                      <>
                        <iframe
                          src={video.videoUrl
                            .replace('watch?v=', 'embed/')
                            .replace('youtu.be/', 'youtube.com/embed/') + '?rel=0&modestbranding=1&playsinline=1&autoplay=1'}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          loading="lazy"
                          className="w-full h-full"
                        />
                      </>
                    ) : video.videoUrl?.includes('mux.com') ? (
                      <MuxPlayer
                        streamType="on-demand"
                        playbackId={video.videoUrl?.split('/').pop()?.replace('.m3u8', '')}
                        metadata={{
                          video_title: video.title,
                          viewer_user_id: 'anonymous',
                        }}
                        poster={video.thumbnail}
                        autoPlay
                        muted
                        playsInline
                        onLoadedMetadata={() => setIsLoading(false)}
                        onCanPlay={() => setIsLoading(false)}
                        onWaiting={() => setIsLoading(true)}
                        onEnded={() => setPlayingVideoIndex(null)}
                        style={{ aspectRatio: '16/9', // @ts-ignore CSS var for mux-player
                          ['--media-object-fit' as any]: 'cover' }}
                        className="w-full h-full"
                      />
                    ) : (
                      <video
                        controls
                        autoPlay
                        muted
                        playsInline
                        poster={video.thumbnail}
                        onLoadedMetadata={() => setIsLoading(false)}
                        onCanPlay={() => setIsLoading(false)}
                        onWaiting={() => setIsLoading(true)}
                        onEnded={() => setPlayingVideoIndex(null)}
                        className="w-full h-full object-cover"
                        src={video.videoUrl?.startsWith('http') ? video.videoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${video.videoUrl}`}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}

                    {/* Close button */}
                    <button
                      aria-label="Close video"
                      onClick={() => setPlayingVideoIndex(null)}
                      className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Loading overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="w-full h-full cursor-pointer relative"
                    onClick={() => { setIsLoading(true); setPlayingVideoIndex(index); }}
                  >
                    <img 
                      loading="lazy"
                      decoding="async"
                      src={video.thumbnail || `https://source.unsplash.com/random/800x600?church,ethiopia&sig=${index}`} 
                      alt={video.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-75 group-hover:scale-110 transition-all duration-700"
                    />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-300 border border-white/40">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5" style={{ color: brandColors.primaryHex }} />
                        </div>
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {video.duration && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-medium text-white flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {video.duration}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  {video.category && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md uppercase tracking-wide">
                      {video.category}
                    </span>
                  )}
                  {video.category && <span className="text-gray-400 text-xs">•</span>}
                    <span className="text-gray-500 text-xs">{video.date || 'Recently Added'}</span>
                </div>
                
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 transition-colors"
                    style={{ color: brandColors.primaryHex }}>
                  {video.title || 'Untitled Video'}
                </h3>
                
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {video.description || 'No description available.'}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${index}`}
                        alt="Author"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{video.author || 'EOTY Team'}</span>
                  </div>
                  
                  <button 
                    onClick={() => { setIsLoading(true); setPlayingVideoIndex(index); }}
                    className="font-medium text-sm hover:underline"
                    style={{ color: brandColors.primaryHex }}
                  >
                    {playingVideoIndex === index ? 'Playing...' : 'Watch Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed"
              style={{ borderColor: `${brandColors.primaryHex}33` }}>
              <p className="text-gray-700 font-semibold mb-2">{t('landing.videos.empty_title')}</p>
              <p className="text-gray-500 text-sm">{t('landing.videos.empty_subtitle')}</p>
              <Link to="/resources?type=video" className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: brandColors.primaryHex, color: brandColors.textOnPrimary }}>
                {t('landing.videos.empty_cta')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

export default VideoSection;

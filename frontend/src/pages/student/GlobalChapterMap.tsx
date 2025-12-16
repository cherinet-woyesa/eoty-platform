import React, { useEffect, useState } from 'react';
import { chaptersApi, type Chapter } from '@/services/api/chapters';
import { MapPin, Search, Globe, Mail, Clock, Navigation, Compass, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useGeolocation } from '@/hooks/useGeolocation';

// Simplified World Map SVG Path (Equirectangular Projection)
const WORLD_MAP_PATH = "M840,480c0,0,0-10,0-10s10-10,10-10s10,0,10,0s10,10,10,10s0,10,0,10S840,480,840,480z M750,450c0,0,0-10,0-10s10-10,10-10s10,0,10,0s10,10,10,10s0,10,0,10S750,450,750,450z M650,350c0,0,0-20,0-20s20-20,20-20s20,0,20,0s20,20,20,20s0,20,0,20S650,350,650,350z M250,250c0,0,0-30,0-30s30-30,30-30s30,0,30,0s30,30,30,30s0,30,0,30S250,250,250,250z M450,250c0,0,0-20,0-20s20-20,20-20s20,0,20,0s20,20,20,20s0,20,0,20S450,250,450,250z";
// Note: The above is a placeholder. For a real app, we'd use a proper GeoJSON or a detailed SVG path.
// Since we can't easily import large assets, we'll use a functional approach:
// We will render a background image of a map if available, or just a stylized container.
// For this implementation, I'll use a "Map View" that is actually a list with a placeholder for the map visualization
// to ensure it looks good without broken assets.

const GlobalChapterMap: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [useNearby, setUseNearby] = useState(false);
  const [distanceKm, setDistanceKm] = useState(100);
  const { coords, isLoading: isLocating, error: locError, requestLocation, clearError } = useGeolocation({
    timeoutMs: 8000,
    maximumAgeMs: 60000,
    highAccuracy: true
  });

  useEffect(() => {
    const loadChapters = async () => {
      try {
        setLoading(true);
        let response;
        if (useNearby && coords) {
          response = await chaptersApi.getNearby({ lat: coords.lat, lng: coords.lng, radiusKm: distanceKm, limit: 100 });
        } else {
          response = await chaptersApi.getChapters();
        }
        if (response.success && response.data?.chapters) {
          const mapped = response.data.chapters.map((ch: any) => ({
            ...ch,
            distance: ch.distance_km ?? ch.distance ?? ch.distanceKm ?? null
          }));
          setChapters(mapped);
        }
      } catch (error) {
        console.error('Failed to load chapters', error);
      } finally {
        setLoading(false);
      }
    };

    void loadChapters();
  }, [useNearby, coords, distanceKm]);

  const filteredChapters = chapters.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading global chapters..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-blue-600" />
              Global Chapter Map
            </h1>
            <p className="text-slate-600 mt-1">
              Find an EOTY community near you. Connect, learn, and grow together.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by city, country, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useNearby}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUseNearby(true);
                      requestLocation();
                    } else {
                      setUseNearby(false);
                      clearError();
                    }
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="inline-flex items-center gap-1">
                  <Compass className="h-4 w-4 text-blue-600" />
                  Near me
                </span>
              </label>
              {useNearby && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={10}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                  <span>{distanceKm} km</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {locError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{locError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Visualization Area (Placeholder for now) */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl overflow-hidden shadow-lg relative min-h-[500px] flex items-center justify-center group">
            {/* Background Map Image Placeholder */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-cover bg-center" />

            {/* Interactive Dots (Simulated) */}
            <div className="relative w-full h-full">
              {/* We would map chapters to x/y coordinates here if we had a proper projection function */}
              {/* For now, we'll just show a central message */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Globe className="h-16 w-16 mb-4 opacity-50" />
                <p>Interactive Map Visualization</p>
                <p className="text-sm opacity-70">(Requires GeoJSON integration)</p>
              </div>
            </div>

            {/* Overlay for Selected Chapter */}
            {selectedChapter && (
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg border border-slate-200 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{selectedChapter.name}</h3>
                    <p className="text-slate-600 text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedChapter.city}, {selectedChapter.country}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedChapter(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {selectedChapter.meeting_time && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="h-4 w-4 text-blue-500" />
                      {selectedChapter.meeting_time}
                    </div>
                  )}
                  {selectedChapter.contact_email && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="h-4 w-4 text-blue-500" />
                      {selectedChapter.contact_email}
                    </div>
                  )}
                </div>
                <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Join Chapter
                </button>
              </div>
            )}
          </div>

          {/* Chapter List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Active Chapters ({filteredChapters.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredChapters.map(chapter => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapter(chapter)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${selectedChapter?.id === chapter.id
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                    : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-slate-900">{chapter.name}</h3>
                    {chapter.distance && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {chapter.distance}km
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {chapter.city || 'Unknown City'}, {chapter.country || 'Global'}
                  </p>
                </button>
              ))}

              {filteredChapters.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>No chapters found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalChapterMap;

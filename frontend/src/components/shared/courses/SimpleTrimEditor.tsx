import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, CheckCircle, Scissors, Maximize2, Minimize2, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface SimpleTrimEditorProps {
  videoBlob: Blob;
  videoUrl: string;
  onEditComplete: (editedBlob: Blob) => void;
  onCancel: () => void;
}

const SimpleTrimEditor: React.FC<SimpleTrimEditorProps> = ({ videoBlob, videoUrl, onEditComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      setDuration(v.duration || 0);
      setEnd(v.duration || 0);
    };
    v.addEventListener('loadedmetadata', onLoaded);
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause(); else {
      if (currentTime >= end) v.currentTime = start;
      v.play();
    }
    setIsPlaying(!isPlaying);
  };

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const processTrim = async (s: number, e: number): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const v = videoRef.current;
        if (!v) return reject(new Error('Video not ready'));
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No 2D context'));
        const stream = canvas.captureStream(30);
        const chunks: Blob[] = [];
        const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 2500000 });
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        rec.onerror = (e) => reject(e);
        rec.start(100);
        v.currentTime = s;
        await new Promise<void>((res) => {
          v.onseeked = () => {
            v.play();
            const loop = () => {
              if (v.currentTime >= e) {
                v.pause();
                rec.stop();
                res();
                return;
              }
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              requestAnimationFrame(loop);
            };
            loop();
          };
        });
      } catch (err) {
        reject(err as any);
      }
    });
  };

  const save = async () => {
    setProcessing(true);
    try {
      if (start === 0 && end === duration) {
        onEditComplete(videoBlob);
        return;
      }
      const blob = await processTrim(start, end);
      onEditComplete(blob);
    } catch (e) {
      console.error(e);
      alert('Failed to export trimmed video');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl border border-gray-200 shadow-2xl w-full ${isFullscreen ? 'max-w-full h-full' : 'max-w-5xl'} p-6 flex flex-col`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border" style={{ backgroundColor: `${brandColors.primaryHex}0D`, borderColor: `${brandColors.primaryHex}1A` }}>
              <Scissors className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Video Editor</h2>
              <p className="text-sm text-gray-500">Trim your video to the perfect length</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={()=>setIsFullscreen(v=>!v)} 
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
            >
              {isFullscreen? <Minimize2 className="h-5 w-5"/>:<Maximize2 className="h-5 w-5"/>}
            </button>
            <button 
              onClick={onCancel} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={save} 
              disabled={processing} 
              className="px-5 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"/>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4"/>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-center bg-gray-900 rounded-2xl p-6 shadow-inner">
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
              onTimeUpdate={() => {
                const t = videoRef.current?.currentTime || 0;
                setCurrentTime(t);
                if (t >= end && isPlaying) {
                  videoRef.current?.pause();
                  setIsPlaying(false);
                }
              }}
              onPlay={()=>setIsPlaying(true)}
              onPause={()=>setIsPlaying(false)}
              controls={false}
            />
          </div>

          {/* Enhanced controls */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime-10,start,end);} }} 
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="Skip back 10s"
            >
              <SkipBack className="h-5 w-5"/>
            </button>
            <button 
              onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime-5,start,end);} }} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              -5s
            </button>
            <button 
              onClick={togglePlay} 
              className="p-4 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
              style={{ backgroundColor: brandColors.primaryHex }}
            >
              {isPlaying? <Pause className="h-6 w-6"/>:<Play className="h-6 w-6"/>}
            </button>
            <button 
              onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime+5,start,end);} }} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              +5s
            </button>
            <button 
              onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime+10,start,end);} }} 
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="Skip forward 10s"
            >
              <SkipForward className="h-5 w-5"/>
            </button>
            <button 
              onClick={() => { if(videoRef.current) { videoRef.current.currentTime = start; setCurrentTime(start); }}}
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="Reset to start"
            >
              <RotateCcw className="h-5 w-5"/>
            </button>
          </div>

          {/* Enhanced trim controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColors.primaryHex }}></div>
                  Start Point
                </label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={()=>{ setStart(Math.min(currentTime, end-0.5)); }} 
                    className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                    style={{ backgroundColor: brandColors.primaryHex }}
                  >
                    Set Here
                  </button>
                  <div className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-mono text-sm font-medium text-gray-900">
                    {format(start)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  End Point
                </label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={()=>{ setEnd(Math.max(currentTime, start+0.5)); }} 
                    className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-sm hover:shadow-md bg-red-500 hover:bg-red-600"
                  >
                    Set Here
                  </button>
                  <div className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-mono text-sm font-medium text-gray-900">
                    {format(end)}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Timeline</span>
                <span>Duration: {format(end - start)}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={clamp(currentTime, 0, duration || 0)}
                  onChange={(e)=>{
                    const t = clamp(parseFloat(e.target.value), 0, duration || 0);
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setCurrentTime(t);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, ${brandColors.primaryHex} 0%, ${brandColors.primaryHex} ${(start/duration)*100}%, #e5e7eb ${(start/duration)*100}%, #e5e7eb ${(end/duration)*100}%, ${brandColors.primaryHex} ${(end/duration)*100}%, ${brandColors.primaryHex} 100%)`
                  }}
                />
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono mt-2">
                  <span>{format(0)}</span>
                  <span>{format(start)}</span>
                  <span>{format(end)}</span>
                  <span>{format(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTrimEditor;

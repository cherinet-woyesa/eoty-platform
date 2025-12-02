import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, CheckCircle, X, Scissors, Maximize2, Minimize2 } from 'lucide-react';

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
      <div className={`bg-slate-900 rounded-xl border border-slate-800 shadow-2xl w-full ${isFullscreen ? 'max-w-full h-full' : 'max-w-4xl'} p-4 flex flex-col`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700"><Scissors className="h-4 w-4 text-blue-400"/></div>
            <span className="font-semibold">Quick Trim</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setIsFullscreen(v=>!v)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">{isFullscreen? <Minimize2 className="h-4 w-4"/>:<Maximize2 className="h-4 w-4"/>}</button>
            <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button onClick={save} disabled={processing} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center">
              {processing ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"/>Processing...</> : <><CheckCircle className="h-3 w-3 mr-2"/>Save</>}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-center bg-black/60 rounded-lg p-3">
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-w-full max-h-[50vh] object-contain"
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

          {/* Simple controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime-5,start,end);} }} className="px-3 py-1 text-sm bg-slate-800 text-slate-200 rounded border border-slate-700">-5s</button>
            <button onClick={togglePlay} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500">{isPlaying? <Pause className="h-5 w-5"/>:<Play className="h-5 w-5"/>}</button>
            <button onClick={()=>{ if(videoRef.current){ videoRef.current.currentTime = clamp(currentTime+5,start,end);} }} className="px-3 py-1 text-sm bg-slate-800 text-slate-200 rounded border border-slate-700">+5s</button>
          </div>

          {/* Start/End set and range */}
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span>Start</span>
              <button onClick={()=>{ setStart(Math.min(currentTime, end-0.5)); }} className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Set here</button>
              <span className="font-mono">{format(start)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>End</span>
              <button onClick={()=>{ setEnd(Math.max(currentTime, start+0.5)); }} className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Set here</button>
              <span className="font-mono">{format(end)}</span>
            </div>
          </div>

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
            className="w-full accent-blue-500"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{format(0)}</span>
            <span>{format(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTrimEditor;

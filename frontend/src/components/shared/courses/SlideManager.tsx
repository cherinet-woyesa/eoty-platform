import React, { useState, useRef } from 'react';
import { 
  Upload, X, ChevronLeft, ChevronRight, 
  Play, Square, Clock, FileText,
  Download, Trash2, Plus
} from 'lucide-react';

interface Slide {
  id: string;
  file: File;
  previewUrl: string;
  duration: number;
  notes?: string;
}

interface SlideManagerProps {
  onSlidesChange: (slides: Slide[]) => void;
  onSlideAdvance: (slideIndex: number) => void;
}

const SlideManager: React.FC<SlideManagerProps> = ({
  onSlidesChange,
  onSlideAdvance
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const newSlides: Slide[] = files.map(file => {
      const previewUrl = file.type.startsWith('image/') 
        ? URL.createObjectURL(file)
        : '/slide-placeholder.png'; // For PDFs, use placeholder

      return {
        id: `slide-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        duration: 10, // Default 10 seconds per slide
        notes: ''
      };
    });

    const updatedSlides = [...slides, ...newSlides];
    setSlides(updatedSlides);
    onSlidesChange(updatedSlides);
  };

  const removeSlide = (slideId: string) => {
    const updatedSlides = slides.filter(slide => slide.id !== slideId);
    setSlides(updatedSlides);
    
    // Update current index if needed
    if (currentSlideIndex >= updatedSlides.length) {
      setCurrentSlideIndex(Math.max(0, updatedSlides.length - 1));
    }
    
    onSlidesChange(updatedSlides);
  };

  const updateSlideDuration = (slideId: string, duration: number) => {
    const updatedSlides = slides.map(slide =>
      slide.id === slideId ? { ...slide, duration } : slide
    );
    setSlides(updatedSlides);
    onSlidesChange(updatedSlides);
  };

  const updateSlideNotes = (slideId: string, notes: string) => {
    const updatedSlides = slides.map(slide =>
      slide.id === slideId ? { ...slide, notes } : slide
    );
    setSlides(updatedSlides);
    onSlidesChange(updatedSlides);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      onSlideAdvance(newIndex);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      onSlideAdvance(newIndex);
    }
  };

  const startSlideshow = () => {
    if (slides.length === 0) return;
    
    setIsPlaying(true);
    let currentIndex = currentSlideIndex;

    playIntervalRef.current = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        currentIndex++;
        setCurrentSlideIndex(currentIndex);
        onSlideAdvance(currentIndex);
      } else {
        stopSlideshow();
      }
    }, slides[currentIndex]?.duration * 1000 || 10000);
  };

  const stopSlideshow = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const getTotalDuration = () => {
    return slides.reduce((total, slide) => total + slide.duration, 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Presentation Slides
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {slides.length} slides • {formatTime(getTotalDuration())}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Slides
          </button>
        </div>
      </div>

      {slides.length > 0 ? (
        <div className="space-y-4">
          {/* Current Slide Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">
                Slide {currentSlideIndex + 1} of {slides.length}
              </h4>
              <div className="flex items-center space-x-2">
                {!isPlaying ? (
                  <button
                    onClick={startSlideshow}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={stopSlideshow}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={previousSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {slides[currentSlideIndex] && (
              <div className="flex space-x-4">
                <div className="flex-1">
                  <img
                    src={slides[currentSlideIndex].previewUrl}
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="w-full h-48 object-contain bg-white border border-gray-200 rounded"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={slides[currentSlideIndex].duration}
                      onChange={(e) => updateSlideDuration(slides[currentSlideIndex].id, parseInt(e.target.value))}
                      className="w-20 p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={slides[currentSlideIndex].notes || ''}
                      onChange={(e) => updateSlideNotes(slides[currentSlideIndex].id, e.target.value)}
                      placeholder="Add notes for this slide..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slide Thumbnails */}
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`relative border-2 rounded-lg cursor-pointer ${
                  index === currentSlideIndex ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => setCurrentSlideIndex(index)}
              >
                <img
                  src={slide.previewUrl}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
                <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {formatTime(slide.duration)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSlide(slide.id);
                  }}
                  className="absolute top-1 left-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-0.5">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No slides added yet</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload PowerPoint or Images
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Supports PDF, PPT, PPTX, JPG, PNG
          </p>
        </div>
      )}
    </div>
  );
};

export default SlideManager;
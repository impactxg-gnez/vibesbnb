'use client';

import { useState, useRef } from 'react';
import { 
  X, 
  GripVertical, 
  Star, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpToLine,
  Image as ImageIcon
} from 'lucide-react';

interface ImageReorderProps {
  images: string[];
  onReorder: (newImages: string[]) => void;
  onRemove: (index: number) => void;
  roomName?: string;
}

export default function ImageReorder({ images, onReorder, onRemove, roomName }: ImageReorderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);
    
    onReorder(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    
    onReorder(newImages);
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    moveImage(index, 0);
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <ImageIcon size={32} className="mb-2 opacity-50" />
        <p className="text-sm">No images uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
        <span>Drag to reorder • First image is the cover photo</span>
        <span>{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={`${image.slice(0, 50)}-${index}`}
            ref={draggedIndex === index ? dragNodeRef : null}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`relative group rounded-xl overflow-hidden transition-all duration-200 ${
              draggedIndex === index 
                ? 'opacity-50 scale-95' 
                : dragOverIndex === index 
                  ? 'ring-2 ring-emerald-500 scale-105' 
                  : ''
            } ${index === 0 ? 'ring-2 ring-amber-500' : ''}`}
          >
            {/* Cover Badge */}
            {index === 0 && (
              <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-amber-500 text-black text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg">
                <Star size={12} fill="currentColor" />
                Cover
              </div>
            )}

            {/* Image */}
            <div className="aspect-square bg-gray-800">
              <img
                src={image}
                alt={`${roomName || 'Property'} - Image ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Drag Handle Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Drag Handle */}
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg cursor-grab active:cursor-grabbing">
                <GripVertical size={16} className="text-white" />
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                {/* Move Buttons */}
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      className="p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition"
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      className="p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition"
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  )}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setAsCover(index)}
                      className="p-1.5 bg-amber-500/80 backdrop-blur-sm text-black rounded-lg hover:bg-amber-500 transition flex items-center gap-1"
                      title="Set as cover photo"
                    >
                      <ArrowUpToLine size={14} />
                      <span className="text-xs font-medium hidden sm:inline">Cover</span>
                    </button>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1.5 bg-red-600/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-600 transition"
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Position Number */}
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-0 transition-opacity">
              <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-lg">
                #{index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      {images.length > 1 && (
        <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-xs text-gray-400">
            💡 <strong className="text-gray-300">Tips:</strong> Drag images to reorder them. 
            Click the <Star size={10} className="inline text-amber-500" /> button to set any image as the cover photo.
            The cover photo will be the first thing travelers see.
          </p>
        </div>
      )}
    </div>
  );
}

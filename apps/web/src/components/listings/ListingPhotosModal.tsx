'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { altForImageUrl, type ImageAltEntry } from '@/lib/accessibility';
import {
  listingCardMainImageUrl,
  listingGalleryImageUrl,
} from '@/lib/propertyImageUrls';

type ListingPhotosModalProps = {
  open: boolean;
  onClose: () => void;
  images: string[];
  imageAlts?: ImageAltEntry[] | unknown;
  propertyName: string;
  initialIndex?: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function ListingPhotosModal({
  open,
  onClose,
  images,
  imageAlts,
  propertyName,
  initialIndex = 0,
}: ListingPhotosModalProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (!open) {
      setViewerIndex(null);
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
      return;
    }
    setViewerIndex(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, [open]);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  const handleDialogClose = () => {
    if (viewerIndex != null) {
      closeViewer();
      return;
    }
    onClose();
  };

  const setZoomClamped = (next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 10) / 10));
    setZoom(clamped);
    if (clamped <= MIN_ZOOM) setPan({ x: 0, y: 0 });
  };

  const go = useCallback(
    (delta: number) => {
      if (viewerIndex == null || images.length === 0) return;
      const next = (viewerIndex + delta + images.length) % images.length;
      setViewerIndex(next);
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
    },
    [images.length, viewerIndex]
  );

  useEffect(() => {
    if (!open || viewerIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomClamped(zoom + ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomClamped(zoom - ZOOM_STEP);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, open, viewerIndex, zoom]);

  if (!open) return null;

  const viewerSrc = viewerIndex != null ? images[viewerIndex] : null;
  const viewerAlt =
    viewerSrc != null
      ? altForImageUrl(
          viewerSrc,
          imageAlts,
          `${propertyName} — photo ${(viewerIndex ?? 0) + 1} of ${images.length}`
        )
      : '';

  return (
    <AccessibleDialog
      open={open}
      onClose={handleDialogClose}
      title={`All photos of ${propertyName}`}
      className="items-stretch justify-center p-0 sm:p-4"
      panelClassName="flex h-full w-full max-h-full max-w-6xl flex-col overflow-hidden rounded-none bg-gray-950 sm:rounded-2xl border border-gray-800"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3 shrink-0">
        <p className="text-white font-semibold truncate">
          {propertyName}
          <span className="text-gray-400 font-normal ml-2">
            {images.length} photo{images.length === 1 ? '' : 's'}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
          aria-label="Close photo gallery"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {images.map((url, index) => {
            const src = url.startsWith('data:') ? url : listingCardMainImageUrl(url);
            const isStart = index === initialIndex;
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => openViewer(index)}
                className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-900 text-left group ${
                  isStart ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={altForImageUrl(url, imageAlts, `${propertyName} — photo ${index + 1}`)}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-2 right-2 text-[11px] font-medium text-white bg-black/55 px-2 py-0.5 rounded">
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerSrc != null && viewerIndex != null && (
        <div className="absolute inset-0 z-20 flex flex-col bg-black">
          <div className="flex items-center justify-between gap-2 px-3 py-3 shrink-0">
            <p className="text-white text-sm font-medium">
              {viewerIndex + 1} / {images.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomClamped(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                className="p-2 rounded-lg text-white hover:bg-white/10 disabled:opacity-40"
                aria-label="Zoom out"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-white/80 text-xs w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomClamped(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                className="p-2 rounded-lg text-white hover:bg-white/10 disabled:opacity-40"
                aria-label="Zoom in"
              >
                <ZoomIn size={20} />
              </button>
              <button
                type="button"
                onClick={() => setZoomClamped(MIN_ZOOM)}
                disabled={zoom <= MIN_ZOOM}
                className="p-2 rounded-lg text-white hover:bg-white/10 disabled:opacity-40"
                aria-label="Reset zoom"
              >
                <Maximize2 size={18} />
              </button>
              <button
                type="button"
                onClick={closeViewer}
                className="p-2 rounded-lg text-white hover:bg-white/10 ml-1"
                aria-label="Back to all photos"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div
            className={`relative flex-1 overflow-hidden ${zoom > MIN_ZOOM ? 'cursor-grab' : 'cursor-zoom-in'} ${dragging ? 'cursor-grabbing' : ''}`}
            onDoubleClick={() => setZoomClamped(zoom > MIN_ZOOM ? MIN_ZOOM : 2)}
            onPointerDown={(e) => {
              if (zoom <= MIN_ZOOM) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
            }}
            onPointerMove={(e) => {
              if (!dragging || zoom <= MIN_ZOOM) return;
              setPan({
                x: dragStart.panX + (e.clientX - dragStart.x),
                y: dragStart.panY + (e.clientY - dragStart.y),
              });
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                viewerSrc.startsWith('data:')
                  ? viewerSrc
                  : listingGalleryImageUrl(viewerSrc)
              }
              alt={viewerAlt}
              draggable={false}
              className="absolute left-1/2 top-1/2 max-h-full max-w-full object-contain select-none"
              style={{
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
          <p className="text-center text-white/50 text-xs py-2 shrink-0">
            Double-click or use + / − to zoom. Drag to pan when zoomed.
          </p>
        </div>
      )}
    </AccessibleDialog>
  );
}

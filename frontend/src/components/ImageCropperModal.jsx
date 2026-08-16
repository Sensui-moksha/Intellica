import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crop, ZoomIn, ZoomOut, RotateCw, Check, X,
  Move, Sparkles, RefreshCw, Eye
} from 'lucide-react';

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setPreviewDataUrl('');
    }
  }, [imageSrc, isOpen]);

  const handleImageLoaded = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  // Mouse & Touch Drag Handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setScale(prev => Math.min(Math.max(prev + delta, 0.6), 3.5));
  };

  // Generate real-time live crop preview on canvas
  const generateCroppedImage = useCallback((forExport = false) => {
    if (!imageRef.current) return null;

    const img = imageRef.current;
    const canvasSize = forExport ? 512 : 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Save context
    ctx.save();
    ctx.translate(canvasSize / 2, canvasSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // The display area is 280x280
    const displaySize = 280;
    const scaleFactor = canvasSize / displaySize;

    // Draw transformed image
    const drawWidth = (img.naturalWidth * scale * scaleFactor);
    const drawHeight = (img.naturalHeight * scale * scaleFactor);
    const drawX = (position.x * scaleFactor) - (drawWidth / 2);
    const drawY = (position.y * scaleFactor) - (drawHeight / 2);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    return canvas;
  }, [scale, rotation, position]);

  // Update live preview thumbnail
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const canvas = generateCroppedImage(false);
    if (canvas) {
      setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    }
  }, [scale, rotation, position, isOpen, imageSrc, generateCroppedImage]);

  const handleApplyCrop = () => {
    const canvas = generateCroppedImage(true);
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'cropped_profile_image.jpg', { type: 'image/jpeg' });
      const previewUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCropComplete({ file, previewUrl });
      onClose();
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                <Crop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Adjust & Crop Profile Photo</h3>
                <p className="text-xs text-slate-500">Drag to position, scroll or slide to zoom into your face.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Crop Workspace */}
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            {/* Viewport */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
              className="relative w-[280px] h-[280px] rounded-3xl overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-slate-800"
            >
              {/* Image Transform Target */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop Target"
                onLoad={handleImageLoaded}
                draggable={false}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  position: 'absolute',
                  pointerEvents: 'none'
                }}
                className="transition-transform duration-75 ease-out"
              />

              {/* Circular Overlay Mask (Darkened exterior, illuminated circle center) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Translucent Backdrop Mask with cutout */}
                <div
                  className="w-full h-full"
                  style={{
                    background: 'radial-gradient(circle 115px at center, transparent 114px, rgba(15, 23, 42, 0.75) 115px)'
                  }}
                />
                {/* Circular Boundary Ring */}
                <div className="absolute w-[230px] h-[230px] rounded-full border-2 border-dashed border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />
                {/* Center Crosshair Hint */}
                <div className="absolute w-4 h-4 border-t border-l border-white/40 pointer-events-none" />
                <div className="absolute w-4 h-4 border-b border-r border-white/40 pointer-events-none" />
              </div>

              {/* Drag Hint Pill */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white/90 flex items-center gap-1 pointer-events-none">
                <Move className="w-2.5 h-2.5" />
                <span>Drag to align</span>
              </div>
            </div>

            {/* Live Circular Previews Column */}
            <div className="flex sm:flex-col items-center justify-center gap-4 text-center">
              <div className="space-y-1">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-blue-500 shadow-lg bg-slate-100 mx-auto flex items-center justify-center">
                  {previewDataUrl ? (
                    <img src={previewDataUrl} alt="Dashboard Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Eye className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <span className="text-[10px] font-black text-slate-600 block">Dashboard Hero</span>
              </div>

              <div className="space-y-1">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500 shadow-md bg-slate-100 mx-auto flex items-center justify-center">
                  {previewDataUrl ? (
                    <img src={previewDataUrl} alt="Header Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Eye className="w-3 h-3 text-slate-300" />
                  )}
                </div>
                <span className="text-[10px] font-black text-slate-600 block">Top Nav Bar</span>
              </div>
            </div>
          </div>

          {/* Controls: Zoom Slider and Rotate */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(s - 0.15, 0.6))}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />

              <button
                type="button"
                onClick={() => setScale(s => Math.min(s + 0.15, 3.5))}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-black text-slate-700 min-w-10 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Rotation & Reset Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={() => { setScale(1); setRotation(0); setPosition({ x: 0, y: 0 }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Alignment</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Set Profile Photo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

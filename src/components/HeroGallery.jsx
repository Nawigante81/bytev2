import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * HeroGallery
 * A lightweight, autoplaying image gallery for the hero section.
 *
 * Props:
 * - images: Array<{ src: string; alt?: string }>
 * - intervalMs?: number (default 3500)
 * - className?: string (additional classes for the wrapper)
 */
const HeroGallery = ({
  images = [],
  intervalMs = 3500,
  className = '',
}) => {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const count = images.length;
  const [loaded, setLoaded] = useState(() => new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const next = () => setIndex((i) => (i + 1) % Math.max(count, 1));
  const prev = () => setIndex((i) => (i - 1 + Math.max(count, 1)) % Math.max(count, 1));

  useEffect(() => {
    if (count <= 1) return; // No autoplay if only one image
    timer.current = setInterval(next, intervalMs);
    return () => clearInterval(timer.current);
  }, [count, intervalMs]);

  const pause = () => timer.current && clearInterval(timer.current);
  const resume = () => {
    if (count <= 1) return;
    timer.current = setInterval(next, intervalMs);
  };

  // Preload next image to avoid flicker
  useEffect(() => {
    if (!count) return;
    const n = (index + 1) % count;
    const img = new Image();
    img.src = images[n]?.src;
  }, [index, count, images]);

  const handleImageLoad = (i) => {
    setLoaded((prev) => new Set(prev).add(i));
  };

  if (!count) return null;

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-primary/40 shadow-[0_0_30px_0_hsl(var(--primary)/0.25)]"
        onMouseEnter={pause}
        onMouseLeave={resume}
        role="button"
        tabIndex={0}
        aria-label="Powiększ zdjęcie"
        onClick={() => {
          pause();
          setLightboxOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pause();
            setLightboxOpen(true);
          }
        }}
      >
  <div className="aspect-[16/9] bg-muted/20">
          {/* Placeholder shimmer while the current image is not loaded */}
          {!loaded.has(index) && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60" />
          )}
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={images[index]?.src || index}
              src={images[index]?.src}
              alt={images[index]?.alt || `Zdjęcie ${index + 1}`}
              className={`absolute inset-0 h-full w-full object-cover select-none transition-[filter,opacity] duration-300 ${
                loaded.has(index) ? 'opacity-100' : 'opacity-0'
              }`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.4, scale: 1.02 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchpriority={index === 0 ? 'high' : 'low'}
              onLoad={() => handleImageLoad(index)}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Poprzednie zdjęcie"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur px-2 py-2 border border-border hover:bg-background/90"
            onClick={prev}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Następne zdjęcie"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur px-2 py-2 border border-border hover:bg-background/90"
            onClick={next}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Przejdź do zdjęcia ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index ? 'bg-primary' : 'bg-primary/30 hover:bg-primary/60'
                }`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={(open) => {
        setLightboxOpen(open);
        if (!open) resume();
      }}>
        <DialogContent className="max-w-5xl bg-background/95 p-2 sm:p-4">
          <div className="relative w-full">
            <div className="relative aspect-[16/9]">
              {!loaded.has(index) && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60" />
              )}
              <img
                src={images[index]?.src}
                alt={images[index]?.alt || `Zdjęcie ${index + 1}`}
                className="absolute inset-0 h-full w-full object-contain select-none"
                loading="eager"
                onLoad={() => handleImageLoad(index)}
              />
            </div>
            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Poprzednie zdjęcie"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur px-3 py-3 border border-border hover:bg-background"
                  onClick={prev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Następne zdjęcie"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur px-3 py-3 border border-border hover:bg-background"
                  onClick={next}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HeroGallery;

/**
 * HeroBackground — renders an image or muted/looping video behind hero text,
 * with a configurable dark overlay for foreground legibility.
 *
 * Pure presentational; no editor coupling. Used by both single-slide and the
 * multi-slide rotator.
 */
import { useEffect, useRef } from 'react';

interface HeroBackgroundProps {
  type: 'none' | 'image' | 'video';
  url: string;
  posterUrl?: string;
  fit?: 'cover' | 'contain';
  /** 0..0.8 — black overlay opacity */
  overlayOpacity?: number;
}

export function HeroBackground({
  type,
  url,
  posterUrl,
  fit = 'cover',
  overlayOpacity = 0.4,
}: HeroBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force a load() when the source URL changes so swapped videos restart cleanly.
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {/* autoplay may be blocked; poster will show */});
      }
    }
  }, [type, url]);

  if (type === 'none' || !url) return null;

  const objectFit = fit === 'contain' ? 'object-contain' : 'object-cover';
  const opacity = Math.max(0, Math.min(0.8, overlayOpacity ?? 0.4));

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {type === 'video' ? (
        <video
          ref={videoRef}
          className={`w-full h-full ${objectFit}`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
        >
          <source src={url} />
        </video>
      ) : (
        <img
          src={url}
          alt=""
          className={`w-full h-full ${objectFit}`}
          loading="eager"
          decoding="async"
        />
      )}
      {opacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${opacity})` }}
        />
      )}
    </div>
  );
}

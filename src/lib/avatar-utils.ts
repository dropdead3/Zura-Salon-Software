import type { CSSProperties } from 'react';

interface AvatarComposition {
  photo_focal_x?: number | null;
  photo_focal_y?: number | null;
  avatar_zoom?: number | null;
  avatar_rotation?: number | null;
}

/**
 * Returns inline styles to apply saved avatar composition (focal point, zoom, rotation)
 * to an <AvatarImage> or <img> element rendered as a circular avatar.
 */
export function getAvatarStyle(profile: AvatarComposition | null | undefined): CSSProperties {
  const fx = profile?.photo_focal_x ?? 50;
  const fy = profile?.photo_focal_y ?? 50;
  const zoom = profile?.avatar_zoom ?? 1;
  const rotation = profile?.avatar_rotation ?? 0;

  // Only return transform styles when non-default to avoid unnecessary rendering cost
  if (zoom === 1 && rotation === 0 && fx === 50 && fy === 50) {
    return {};
  }

  return {
    objectPosition: `${fx}% ${fy}%`,
    transform: `scale(${zoom}) rotate(${rotation}deg)`,
    transformOrigin: `${fx}% ${fy}%`,
  };
}

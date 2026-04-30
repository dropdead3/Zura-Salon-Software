/**
 * Legacy entry kept for the website editor section registry. The real
 * implementation now lives in ReviewsManager. This component renders the
 * shared manager locked to the 'general' (homepage) surface so it slots
 * directly into the existing testimonials editor pane.
 */
import { ReviewsManager } from './ReviewsManager';

export function TestimonialsContent() {
  return <ReviewsManager surface="general" />;
}

/**
 * Standalone admin page for testimonials. Delegates to ReviewsManager which
 * exposes both surfaces (homepage / extensions page) via tabs.
 */
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReviewsManager } from '@/components/dashboard/website-editor/ReviewsManager';

export default function TestimonialsManager() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display">Testimonials</h1>
          <p className="text-muted-foreground">
            Manage customer reviews displayed across your website.
          </p>
        </div>
        <ReviewsManager />
      </div>
    </DashboardLayout>
  );
}

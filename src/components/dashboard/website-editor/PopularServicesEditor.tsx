import { Star } from 'lucide-react';
import { usePopularServicesConfig } from '@/hooks/useSectionConfig';
import { SectionDisplayEditor } from './SectionDisplayEditor';

const FIELDS = [
  { key: 'show_eyebrow', label: 'Show Eyebrow', type: 'toggle' as const, description: 'Display the small text above the title' },
  { key: 'section_eyebrow', label: 'Eyebrow Text', type: 'text' as const, placeholder: 'Most Loved' },
  { key: 'show_title', label: 'Show Title', type: 'toggle' as const, description: 'Display the section title' },
  { key: 'section_title', label: 'Section Title', type: 'text' as const, placeholder: 'Popular Services' },
  { key: 'show_description', label: 'Show Description', type: 'toggle' as const, description: 'Display the section description' },
  { key: 'section_description', label: 'Section Description', type: 'textarea' as const, placeholder: 'Describe featured services...' },
  { key: 'max_featured', label: 'Max Featured Services', type: 'slider' as const, min: 3, max: 12, step: 1, description: 'Number of popular services to display' },
  {
    key: 'layout', label: 'Layout Style', type: 'select' as const,
    options: [
      { value: 'grid', label: 'Grid (card layout)' },
      { value: 'carousel', label: 'Carousel (horizontal scroll)' },
    ],
  },
];

export function PopularServicesEditor() {
  const { data, isLoading, isSaving, update } = usePopularServicesConfig();

  return (
    <SectionDisplayEditor
      title="Popular Services Section"
      description="Configure which popular services are highlighted on the homepage."
      icon={Star}
      data={data}
      isLoading={isLoading}
      isSaving={isSaving}
      update={update}
      fields={FIELDS}
      styleSectionId="popular_services"
    />
  );
}

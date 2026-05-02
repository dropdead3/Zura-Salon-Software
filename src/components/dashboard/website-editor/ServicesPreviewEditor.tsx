import { Scissors } from 'lucide-react';
import { useServicesPreviewConfig } from '@/hooks/useSectionConfig';
import { SectionDisplayEditor } from './SectionDisplayEditor';

const FIELDS = [
  { key: 'show_eyebrow', label: 'Show Eyebrow', type: 'toggle' as const, description: 'Display the small text above the title' },
  { key: 'section_eyebrow', label: 'Eyebrow Text', type: 'text' as const, placeholder: 'What We Do' },
  { key: 'show_title', label: 'Show Title', type: 'toggle' as const, description: 'Display the section title' },
  { key: 'section_title', label: 'Section Title', type: 'text' as const, placeholder: 'Our Services' },
  { key: 'show_description', label: 'Show Description', type: 'toggle' as const, description: 'Display the section description' },
  { key: 'section_description', label: 'Section Description', type: 'textarea' as const, placeholder: 'Describe your services...' },
  {
    key: 'layout', label: 'Layout Style', type: 'select' as const,
    options: [
      { value: 'accordion', label: 'Accordion (expandable categories)' },
      { value: 'grid', label: 'Grid (card layout)' },
      { value: 'list', label: 'List (simple rows)' },
    ],
  },
  { key: 'max_categories_visible', label: 'Max Categories Visible', type: 'slider' as const, min: 3, max: 20, step: 1, description: 'How many categories to show before "View All"' },
];

export function ServicesPreviewEditor() {
  const { data, isLoading, isSaving, update } = useServicesPreviewConfig();

  return (
    <SectionDisplayEditor
      title="Services Preview Section"
      description="Configure how the services section appears on the homepage."
      icon={Scissors}
      data={data}
      isLoading={isLoading}
      isSaving={isSaving}
      update={update}
      fields={FIELDS}
      styleSectionId="services_preview"
    />
  );
}

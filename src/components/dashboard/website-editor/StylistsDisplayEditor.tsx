import { Users } from 'lucide-react';
import { useStylistsDisplayConfig } from '@/hooks/useSectionConfig';
import { SectionDisplayEditor } from './SectionDisplayEditor';

const FIELDS = [
  { key: 'show_eyebrow', label: 'Show Eyebrow', type: 'toggle' as const, description: 'Display the small text above the title' },
  { key: 'section_eyebrow', label: 'Eyebrow Text', type: 'text' as const, placeholder: 'Meet The Team' },
  { key: 'show_title', label: 'Show Title', type: 'toggle' as const, description: 'Display the section title' },
  { key: 'section_title', label: 'Section Title', type: 'text' as const, placeholder: 'Our Stylists' },
  { key: 'show_description', label: 'Show Description', type: 'toggle' as const, description: 'Display the section description' },
  { key: 'section_description', label: 'Section Description', type: 'textarea' as const, placeholder: 'Describe your team...' },
  {
    key: 'card_style', label: 'Card Style', type: 'select' as const,
    options: [
      { value: 'detailed', label: 'Detailed (photo, bio, specialties)' },
      { value: 'minimal', label: 'Minimal (photo and name only)' },
    ],
  },
  { key: 'max_visible', label: 'Max Visible Stylists', type: 'slider' as const, min: 3, max: 16, step: 1, description: 'Number of stylists shown on the homepage' },
];

export function StylistsDisplayEditor() {
  const { data, isLoading, isSaving, update } = useStylistsDisplayConfig();

  return (
    <SectionDisplayEditor
      title="Stylists Display Section"
      description="Configure how the stylists section appears on the homepage."
      icon={Users}
      data={data}
      isLoading={isLoading}
      isSaving={isSaving}
      update={update}
      fields={FIELDS}
    />
  );
}

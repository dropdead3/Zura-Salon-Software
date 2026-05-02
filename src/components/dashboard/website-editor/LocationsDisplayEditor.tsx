import { MapPin } from 'lucide-react';
import { useLocationsDisplayConfig } from '@/hooks/useSectionConfig';
import { SectionDisplayEditor } from './SectionDisplayEditor';

const FIELDS = [
  { key: 'show_eyebrow', label: 'Show Eyebrow', type: 'toggle' as const, description: 'Display the small text above the title' },
  { key: 'section_eyebrow', label: 'Eyebrow Text', type: 'text' as const, placeholder: 'Visit Us' },
  { key: 'show_title', label: 'Show Title', type: 'toggle' as const, description: 'Display the section title' },
  { key: 'section_title', label: 'Section Title', type: 'text' as const, placeholder: 'Our Locations' },
  { key: 'show_description', label: 'Show Description', type: 'toggle' as const, description: 'Display the section description' },
  { key: 'section_description', label: 'Section Description', type: 'textarea' as const, placeholder: 'Describe your locations...' },
  {
    key: 'show_map', label: 'Show Map', type: 'toggle' as const,
    description: 'Display an interactive map alongside location cards',
  },
  {
    key: 'layout', label: 'Layout Style', type: 'select' as const,
    options: [
      { value: 'cards', label: 'Cards (rich layout with images)' },
      { value: 'list', label: 'List (compact rows)' },
    ],
  },
];

export function LocationsDisplayEditor() {
  const { data, isLoading, isSaving, update } = useLocationsDisplayConfig();

  return (
    <SectionDisplayEditor
      title="Locations Display Section"
      description="Configure how locations appear on the homepage."
      icon={MapPin}
      data={data}
      isLoading={isLoading}
      isSaving={isSaving}
      update={update}
      fields={FIELDS}
      styleSectionId="locations_display"
    />
  );
}

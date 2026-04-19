export const BRAND_TONES = [
  { key: 'professional', label: 'Professional', description: 'Clear, neutral, business-formal.' },
  { key: 'warm', label: 'Warm', description: 'Approachable, team-first, encouraging.' },
  { key: 'strict', label: 'Strict', description: 'Direct expectations, low ambiguity.' },
  { key: 'modern', label: 'Modern', description: 'Conversational, plain English, current.' },
  { key: 'luxury', label: 'Luxury', description: 'Refined, considered, brand-elevated.' },
] as const;

export type BrandToneKey = typeof BRAND_TONES[number]['key'];

// Keys MUST map 1:1 to the public.app_role Postgres enum so handbooks can
// publish into legacy.visible_to_roles (typed app_role[]) without enum violations.
export const ROLE_OPTIONS = [
  { key: 'stylist', label: 'Stylist' },
  { key: 'stylist_assistant', label: 'Assistant Stylist' },
  { key: 'receptionist', label: 'Front Desk / Receptionist' },
  { key: 'manager', label: 'Salon Manager' },
  { key: 'admin', label: 'Admin / Director' },
  { key: 'assistant', label: 'Apprentice / Associate' },
  { key: 'inventory_manager', label: 'Inventory / Support Staff' },
  { key: 'bookkeeper', label: 'Bookkeeper' },
  { key: 'booth_renter', label: 'Booth Renter' },
] as const;

export const EMPLOYMENT_TYPES = [
  { key: 'w2_full_time', label: 'W2 Full-Time' },
  { key: 'w2_part_time', label: 'W2 Part-Time' },
  { key: 'contractor_1099', label: '1099 Contractor' },
] as const;

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;

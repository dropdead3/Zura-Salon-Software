export const BRAND_TONES = [
  { key: 'professional', label: 'Professional', description: 'Clear, neutral, business-formal.' },
  { key: 'warm', label: 'Warm', description: 'Approachable, team-first, encouraging.' },
  { key: 'strict', label: 'Strict', description: 'Direct expectations, low ambiguity.' },
  { key: 'modern', label: 'Modern', description: 'Conversational, plain English, current.' },
  { key: 'luxury', label: 'Luxury', description: 'Refined, considered, brand-elevated.' },
] as const;

export type BrandToneKey = typeof BRAND_TONES[number]['key'];

export const ROLE_OPTIONS = [
  { key: 'stylist', label: 'Stylist' },
  { key: 'stylist_assistant', label: 'Assistant Stylist' },
  { key: 'front_desk', label: 'Front Desk / Receptionist' },
  { key: 'manager', label: 'Salon Manager' },
  { key: 'director', label: 'Director of Operations' },
  { key: 'educator', label: 'Educator' },
  { key: 'apprentice', label: 'Apprentice / Associate' },
  { key: 'support', label: 'Inventory / Support Staff' },
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

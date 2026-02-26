/**
 * THEME INFRASTRUCTURE TYPES
 *
 * Core type definitions for the Zura Theme Infrastructure System.
 * All types are pure data — no React dependencies.
 */

// ─── Blueprint ──────────────────────────────────────────────

export interface ThemeBlueprintNavigation {
  max_top_level_items: number;
  max_depth: number;
  max_cta_items: number;
  required_cta: boolean;
  sticky_mobile_cta: boolean;
}

export interface ThemeBlueprintUrlStructure {
  pattern: string;
  location_pattern: string;
}

export interface ThemeBlueprintSectionLimit {
  max: number;
}

export interface ThemeBlueprintTokenOverrides {
  lockable: string[];
  defaults: Record<string, string>;
}

export interface ThemeBlueprintLocking {
  header_locked: boolean;
  footer_locked: boolean;
  nav_structure_locked: boolean;
  token_layer_locked: boolean;
}

export interface ThemeBlueprintLocationSupport {
  auto_generate_pages: boolean;
  nav_insertion: 'under_locations' | 'top_level';
  page_template: string;
}

export interface ThemeBlueprint {
  required_pages: string[];
  default_page_templates: Record<string, { sections?: unknown[]; nav_order: number }>;
  default_navigation: ThemeBlueprintNavigation;
  url_structure: ThemeBlueprintUrlStructure;
  allowed_section_types: string[];
  section_limits: Record<string, ThemeBlueprintSectionLimit>;
  header_layout: 'standard' | 'minimal' | 'transparent';
  footer_layout: 'standard' | 'minimal' | 'expanded';
  token_overrides: ThemeBlueprintTokenOverrides;
  locking: ThemeBlueprintLocking;
  max_page_weight: number;
  location_support: ThemeBlueprintLocationSupport;
}

export const EMPTY_BLUEPRINT: ThemeBlueprint = {
  required_pages: ['home'],
  default_page_templates: { home: { nav_order: 0 } },
  default_navigation: {
    max_top_level_items: 7,
    max_depth: 2,
    max_cta_items: 2,
    required_cta: true,
    sticky_mobile_cta: true,
  },
  url_structure: { pattern: '/{page-slug}', location_pattern: '/locations/{location-slug}' },
  allowed_section_types: [],
  section_limits: {},
  header_layout: 'standard',
  footer_layout: 'standard',
  token_overrides: { lockable: [], defaults: {} },
  locking: { header_locked: true, footer_locked: true, nav_structure_locked: false, token_layer_locked: false },
  max_page_weight: 50,
  location_support: { auto_generate_pages: true, nav_insertion: 'under_locations', page_template: 'location_detail' },
};

// ─── Theme Entity ───────────────────────────────────────────

export interface ThemeEntity {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  color_scheme: string;
  typography_preset: Record<string, string>;
  layout_config: Record<string, string>;
  default_sections: Record<string, unknown>;
  is_builtin: boolean;
  is_available: boolean;
  version: string;
  category: string;
  status: 'active' | 'deprecated' | 'experimental';
  supported_features: Record<string, boolean>;
  compatibility_rules: Record<string, unknown>;
  blueprint: ThemeBlueprint;
  organization_id: string | null;
  created_at: string;
  updated_at: string | null;
}

// ─── Section Type Registry ──────────────────────────────────

export interface ThemeSectionType {
  id: string;
  semantic_category: string;
  canonical_fields_schema: Record<string, string>;
  allowed_field_types: string[];
  max_instances_per_page: number | null;
  is_portable: boolean;
  transformation_rules: Record<string, unknown>;
  performance_weight: number;
  is_builtin: boolean;
  created_at: string;
}

// ─── Canonical Content ──────────────────────────────────────

export type CanonicalContentType = 'text' | 'rich_text' | 'image' | 'url' | 'list' | 'structured';

export interface CanonicalContent {
  id: string;
  organization_id: string;
  content_key: string;
  content_type: CanonicalContentType;
  value: Record<string, unknown>;
  source: 'manual' | 'imported' | 'synced';
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Slot Mappings ──────────────────────────────────────────

export interface ThemeSlotMapping {
  id: string;
  theme_id: string;
  slot_id: string;
  semantic_type: string;
  expected_field_type: string;
  required: boolean;
  primary_source: string;
  fallback_source: string | null;
  transformation_rules: Record<string, unknown>;
  performance_priority: number;
  created_at: string;
}

// ─── Content Resolution ─────────────────────────────────────

export type ContentSource =
  | 'page_override'
  | 'canonical_store'
  | 'business_data'
  | 'theme_default'
  | 'empty';

export interface ContentResolution {
  value: unknown;
  source: ContentSource;
  type: string;
  confidence: number; // 0-1
  transformApplied: boolean;
}

export interface SlotBindingResult {
  slotId: string;
  resolution: ContentResolution;
  slot: ThemeSlotMapping;
}

// ─── Theme Activation ───────────────────────────────────────

export interface ThemeActivation {
  id: string;
  organization_id: string;
  theme_id: string;
  theme_version: string;
  pre_switch_snapshot: Record<string, unknown> | null;
  migration_report: ThemeMigrationReport | null;
  activated_at: string;
  activated_by: string | null;
  is_current: boolean;
}

// ─── Migration Report ───────────────────────────────────────

export interface MigrationMapping {
  sectionType: string;
  sourcePageId: string;
  targetPageId: string;
  status: 'mapped' | 'transformed' | 'unmapped';
  notes?: string;
}

export interface ThemeMigrationReport {
  mapped: MigrationMapping[];
  transformed: MigrationMapping[];
  attention: MigrationMapping[];
  timestamp: string;
}

// ─── Validation ─────────────────────────────────────────────

export interface ValidationResult {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  passed: boolean;
  message: string;
  affectedEntity: { type: string; id: string };
}

export interface PublishReadiness {
  canPublish: boolean;
  critical: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
}

// ─── Integrity Scoring ──────────────────────────────────────

export interface IntegrityDimension {
  score: number;
  max: number;
  violations: string[];
}

export interface ThemeIntegrityScore {
  score: number;
  breakdown: {
    required_sections: IntegrityDimension;
    navigation: IntegrityDimension;
    token_drift: IntegrityDimension;
    slot_coverage: IntegrityDimension;
    page_coverage: IntegrityDimension;
    cta_compliance: IntegrityDimension;
  };
  status: 'healthy' | 'warning' | 'critical';
}

// ─── Blueprint Diff (Version Migration) ─────────────────────

export interface BlueprintDiff {
  addedRequiredPages: string[];
  removedSectionTypes: string[];
  changedNavLimits: { field: string; old: number; new: number }[];
  newRequiredSlots: string[];
  changedTokenDefaults: { key: string; old: string; new: string }[];
}

export interface MigrationPlan {
  autoApplicable: { description: string; action: () => void }[];
  requiresReview: { description: string; impact: string }[];
  breaking: { description: string; affectedSections: string[] }[];
}

import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';

// === Booking Settings ===
export interface WebsiteBookingSettings {
  [key: string]: unknown;
  enabled: boolean;
  require_deposit: boolean;
  buffer_minutes: number;
  new_client_mode: 'both' | 'new_only' | 'existing_only';
}

export function useWebsiteBookingSettings() {
  return useSiteSettings<WebsiteBookingSettings>('website_booking');
}

export function useUpdateWebsiteBookingSettings() {
  return useUpdateSiteSetting<WebsiteBookingSettings>();
}

// === Retail Settings ===
export interface WebsiteRetailSettings {
  [key: string]: unknown;
  enabled: boolean;
  pickup: boolean;
  delivery: boolean;
  shipping: boolean;
  featured_products: boolean;
  continue_selling_when_out_of_stock: boolean;
}

export function useWebsiteRetailSettings() {
  return useSiteSettings<WebsiteRetailSettings>('website_retail');
}

export function useUpdateWebsiteRetailSettings() {
  return useUpdateSiteSetting<WebsiteRetailSettings>();
}

// === SEO & Legal Settings ===
export interface WebsiteSeoLegalSettings {
  [key: string]: unknown;
  ga_id: string;
  gtm_id: string;
  meta_pixel_id: string;
  tiktok_pixel_id: string;
  cookie_consent_enabled: boolean;
  privacy_url: string;
  terms_url: string;
}

export function useWebsiteSeoLegalSettings() {
  return useSiteSettings<WebsiteSeoLegalSettings>('website_seo_legal');
}

export function useUpdateWebsiteSeoLegalSettings() {
  return useUpdateSiteSetting<WebsiteSeoLegalSettings>();
}

// === Theme Settings ===
export interface WebsiteThemeSettings {
  [key: string]: unknown;
  color_theme: string;
}

export function useWebsiteThemeSettings() {
  return useSiteSettings<WebsiteThemeSettings>('website_theme');
}

export function useUpdateWebsiteThemeSettings() {
  return useUpdateSiteSetting<WebsiteThemeSettings>();
}

// === Retail Theme Settings ===
export interface WebsiteRetailThemeSettings {
  [key: string]: unknown;
  base_theme: string;
  custom_colors: {
    primary: string;
    background: string;
    card: string;
    foreground: string;
  };
  heading_font: string;
  body_font: string;
  show_logo: boolean;
}

export function useWebsiteRetailThemeSettings() {
  return useSiteSettings<WebsiteRetailThemeSettings>('website_retail_theme');
}

export function useUpdateWebsiteRetailThemeSettings() {
  return useUpdateSiteSetting<WebsiteRetailThemeSettings>();
}

// === Social Links Settings ===
export interface WebsiteSocialLinksSettings {
  [key: string]: unknown;
  instagram: string;
  facebook: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
}

export function useWebsiteSocialLinksSettings() {
  return useSiteSettings<WebsiteSocialLinksSettings>('website_social_links');
}

export function useUpdateWebsiteSocialLinksSettings() {
  return useUpdateSiteSetting<WebsiteSocialLinksSettings>();
}

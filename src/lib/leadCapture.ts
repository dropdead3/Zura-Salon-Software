import { supabase } from '@/integrations/supabase/client';

// Helper to get UTM parameters from URL
export function getUTMParam(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Map referral source to inquiry source
export function mapReferralToSource(referralSource: string): 'website_form' | 'referral' | 'walk_in' | 'other' {
  const lowerSource = referralSource.toLowerCase();
  
  if (lowerSource.includes('walk') || lowerSource.includes('in')) {
    return 'walk_in';
  }
  if (lowerSource.includes('friend') || lowerSource.includes('family') || lowerSource.includes('referral') || lowerSource.includes('stylist')) {
    return 'referral';
  }
  
  // All other sources (Instagram, TikTok, Google, Yelp, etc.) are still website form submissions
  // but we capture the detail in source_detail
  return 'website_form';
}

// Inspiration upload limits — kept conservative for client-side trust
export const INSPIRATION_MAX_FILES = 5;
export const INSPIRATION_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const INSPIRATION_ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

interface LeadData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  service?: string;
  stylist?: string;
  referralSource?: string;
  message?: string;
  inspirationFiles?: File[];
}

async function uploadInspirationFiles(
  inquiryId: string,
  files: File[],
): Promise<void> {
  // Defensive validation — also enforced in UI, but never trust the form
  const valid = files
    .slice(0, INSPIRATION_MAX_FILES)
    .filter(
      (f) =>
        f.size <= INSPIRATION_MAX_BYTES &&
        INSPIRATION_ALLOWED_MIME.includes(f.type),
    );

  if (valid.length === 0) return;

  for (const file of valid) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${inquiryId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('inquiry-inspiration')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Inspiration upload failed:', uploadError);
        continue;
      }

      const { error: rowError } = await supabase
        .from('inquiry_inspiration_photos')
        .insert({
          inquiry_id: inquiryId,
          file_path: filePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
        });

      if (rowError) {
        console.error('Inspiration row insert failed:', rowError);
      }
    } catch (err) {
      console.error('Inspiration upload error:', err);
    }
  }
}

export async function captureWebsiteLead(data: LeadData): Promise<{ success: boolean; error?: string }> {
  try {
    const source = data.referralSource ? mapReferralToSource(data.referralSource) : 'website_form';
    
    const { data: inserted, error } = await supabase
      .from('salon_inquiries')
      .insert({
        source,
        source_detail: data.referralSource || null,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        preferred_location: data.location || null,
        preferred_service: data.service || null,
        preferred_stylist: data.stylist || null,
        message: data.message || null,
        status: 'new',
        utm_source: getUTMParam('utm_source'),
        utm_medium: getUTMParam('utm_medium'),
        utm_campaign: getUTMParam('utm_campaign'),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error capturing lead:', error);
      return { success: false, error: error.message };
    }

    // Upload inspiration files (best-effort — inquiry succeeds either way)
    if (data.inspirationFiles && data.inspirationFiles.length > 0 && inserted?.id) {
      await uploadInspirationFiles(inserted.id, data.inspirationFiles);
    }

    return { success: true };
  } catch (err) {
    console.error('Error capturing lead:', err);
    return { success: false, error: 'Failed to submit inquiry' };
  }
}

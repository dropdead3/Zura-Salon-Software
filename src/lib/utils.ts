import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a display name as "FirstName L." where:
 * - FirstName is the nickname (display_name) if provided, otherwise the first name from full_name
 * - L. is the last initial from full_name
 */
export function formatDisplayName(fullName: string, displayName?: string | null): string {
  if (!fullName?.trim()) return displayName?.trim() || '';
  
  // If nickname exists, replace first name with nickname, keep last name
  if (displayName && displayName.trim()) {
    return formatFullDisplayName(fullName, displayName);
  }
  
  return fullName.trim();
}

/**
 * Formats a full display name where the first name is replaced by nickname if provided.
 * "Eric Day" with nickname "Johnny" becomes "Johnny Day"
 * "Eric Day" with no nickname stays "Eric Day"
 */
export function formatFullDisplayName(fullName: string, displayName?: string | null): string {
  if (!fullName?.trim()) return displayName?.trim() || '';
  
  const nameParts = fullName.trim().split(' ');
  
  // If nickname exists, use it as the first name
  if (displayName && displayName.trim()) {
    const nickname = displayName.trim().split(' ')[0];
    // Replace first name with nickname, keep the rest
    return [nickname, ...nameParts.slice(1)].join(' ');
  }
  
  return fullName;
}

/**
 * Formats a phone number as (XXX) XXX-XXXX
 * Strips non-digits and applies formatting progressively as user types
 */
/**
 * Convenience wrapper: accepts a profile-like object and returns "First L." format.
 */
export function formatName(profile: { full_name?: string | null; display_name?: string | null } | null | undefined): string {
  return formatDisplayName(profile?.full_name || '', profile?.display_name);
}

/**
 * Formats a phone number as (XXX) XXX-XXXX
 * Strips non-digits and applies formatting progressively as user types
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Formats a stored phone number for display.
 * Handles 10-digit and 11-digit (with leading 1) US numbers.
 * Returns original string if it doesn't match expected patterns.
 */
export function formatPhoneDisplay(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  // 11-digit with leading country code 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // 10-digit US number
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

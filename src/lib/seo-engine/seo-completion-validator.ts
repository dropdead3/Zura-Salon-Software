/**
 * SEO Completion Validator.
 * Per-template validation logic (system-verifiable vs proof-required).
 */

import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';

export interface CompletionContext {
  templateKey: string;
  /** Artifacts submitted as proof */
  proofArtifacts: ProofArtifact[];
  /** System-level verification signals */
  systemSignals: SystemVerificationSignals;
  /** Whether a manager has approved (for manual tasks) */
  managerApproved: boolean;
}

export interface ProofArtifact {
  type: 'photo' | 'screenshot' | 'url' | 'text' | 'action_summary';
  value: string;
  uploadedAt: string;
}

export interface SystemVerificationSignals {
  reviewRequestSent?: boolean;
  reviewResponsePosted?: boolean;
  photoCount?: number;
  requiredPhotoCount?: number;
  photoTagsValid?: boolean;
  gbpPostPublished?: boolean;
  pageStructureValid?: boolean;
  metadataValid?: boolean;
  contentLive?: boolean;
  contentLinked?: boolean;
  faqCount?: number;
  requiredFaqCount?: number;
  internalLinkCount?: number;
  requiredInternalLinkCount?: number;
  wordCount?: number;
  requiredWordCount?: number;
  ctaPresent?: boolean;
  ctaAboveFold?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  method: 'system' | 'manual_approved';
  failures: string[];
}

/**
 * Validate whether a task can be marked complete.
 */
export function validateCompletion(ctx: CompletionContext): ValidationResult {
  const template = SEO_TASK_TEMPLATES[ctx.templateKey];
  if (!template) {
    return { valid: false, method: 'system', failures: ['Unknown template.'] };
  }

  // Non-system-verifiable: require proof + manager approval
  if (!template.systemVerifiable) {
    const failures: string[] = [];

    for (const req of template.proofRequirements) {
      if (req === 'manager_approval' && !ctx.managerApproved) {
        failures.push('Manager approval required.');
      } else if (req !== 'manager_approval') {
        const hasProof = ctx.proofArtifacts.some(
          (a) => a.type === req || a.type === 'action_summary',
        );
        if (!hasProof) {
          failures.push(`Proof required: ${req}.`);
        }
      }
    }

    return {
      valid: failures.length === 0,
      method: 'manual_approved',
      failures,
    };
  }

  // System-verifiable: check per template
  const s = ctx.systemSignals;
  const failures: string[] = [];

  switch (ctx.templateKey) {
    case 'review_request':
      if (!s.reviewRequestSent) failures.push('Review request not sent through approved channel.');
      break;

    case 'review_response':
      if (!s.reviewResponsePosted) failures.push('Response not posted to review.');
      break;

    case 'photo_upload':
      if ((s.photoCount ?? 0) < (s.requiredPhotoCount ?? 1))
        failures.push(`Need ${s.requiredPhotoCount ?? 1} photos, have ${s.photoCount ?? 0}.`);
      if (!s.photoTagsValid) failures.push('Photos not properly tagged.');
      break;

    case 'gbp_post':
      if (!s.gbpPostPublished) failures.push('Post not published to GBP listing.');
      break;

    case 'service_page_update':
    case 'page_completion':
    case 'local_landing_page_creation':
      if (!s.pageStructureValid) failures.push('Page structure validation failed.');
      if (!s.contentLive) failures.push('Content is not live.');
      if (!s.contentLinked) failures.push('Page is not linked in navigation.');
      break;

    case 'metadata_fix':
      if (!s.metadataValid) failures.push('Metadata fields do not pass validation.');
      break;

    case 'internal_linking':
      if ((s.internalLinkCount ?? 0) < (s.requiredInternalLinkCount ?? 3))
        failures.push(`Need ${s.requiredInternalLinkCount ?? 3} internal links, have ${s.internalLinkCount ?? 0}.`);
      break;

    case 'before_after_publish':
    case 'stylist_spotlight_publish':
      if (!s.contentLive) failures.push('Content is not live.');
      if (!s.contentLinked) failures.push('Content is not linked correctly.');
      break;

    case 'faq_expansion':
      if ((s.faqCount ?? 0) < (s.requiredFaqCount ?? 3))
        failures.push(`Need ${s.requiredFaqCount ?? 3} FAQs, have ${s.faqCount ?? 0}.`);
      break;

    case 'booking_cta_optimization':
      if (!s.ctaPresent) failures.push('Booking CTA not found on page.');
      if (!s.ctaAboveFold) failures.push('CTA is not above the fold.');
      break;

    case 'service_description_rewrite':
      if ((s.wordCount ?? 0) < (s.requiredWordCount ?? 200))
        failures.push(`Description needs ${s.requiredWordCount ?? 200} words, has ${s.wordCount ?? 0}.`);
      break;

    default:
      // Fallback: allow if no specific checks
      break;
  }

  return {
    valid: failures.length === 0,
    method: 'system',
    failures,
  };
}

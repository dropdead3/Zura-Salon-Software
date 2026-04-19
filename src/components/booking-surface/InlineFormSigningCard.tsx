import { FileText, ShieldCheck, Check } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import type { ServiceFormRequirement } from '@/hooks/useServiceFormRequirements';

interface InlineFormSigningCardProps {
  theme: BookingSurfaceTheme;
  forms: ServiceFormRequirement[];
  signedFormTemplateIds: string[];
  onSignForms?: () => void;
  onDeferForms?: () => void;
}

/**
 * Wave 9: Hybrid public-booking form gate. Renders required-form linkages on the
 * confirm step with two CTAs:
 *  - "Sign now" → opens FormSigningDialog flow; signed IDs are passed to the
 *    create-public-booking edge function so appointments.forms_completed=true
 *    and client_form_signatures rows are written atomically.
 *  - "I'll sign at check-in" → marks deferral; appointment is created with
 *    forms_required=true / forms_completed=false and the kiosk gate enforces
 *    completion before service.
 */
export function InlineFormSigningCard({
  theme,
  forms,
  signedFormTemplateIds,
  onSignForms,
  onDeferForms,
}: InlineFormSigningCardProps) {
  const allSigned =
    forms.length > 0 &&
    forms.every((f) => signedFormTemplateIds.includes(f.form_template_id));

  return (
    <div
      className="p-4 mb-4"
      style={{
        backgroundColor: `${theme.primaryColor}08`,
        borderRadius: 'var(--bk-card-radius, 8px)',
        border: `1px solid ${theme.primaryColor}30`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${theme.primaryColor}15` }}
        >
          {allSigned ? (
            <ShieldCheck className="w-4 h-4" style={{ color: theme.primaryColor }} />
          ) : (
            <FileText className="w-4 h-4" style={{ color: theme.primaryColor }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: theme.textColor }}>
            {allSigned ? 'Forms signed' : 'Required forms for this service'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: theme.mutedTextColor }}>
            {allSigned
              ? `${forms.length} form${forms.length === 1 ? '' : 's'} completed and ready.`
              : 'Sign now to skip the check-in line, or sign on arrival.'}
          </p>

          <ul className="mt-3 space-y-1.5">
            {forms.map((f) => {
              const isSigned = signedFormTemplateIds.includes(f.form_template_id);
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: theme.textColor }}
                >
                  {isSigned ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.primaryColor }} />
                  ) : (
                    <span
                      className="w-3.5 h-3.5 rounded-full border flex-shrink-0"
                      style={{ borderColor: theme.borderColor }}
                    />
                  )}
                  <span className="truncate">
                    {f.form_template?.name ?? 'Form'}
                  </span>
                </li>
              );
            })}
          </ul>

          {!allSigned && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={onSignForms}
                className="px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: theme.primaryColor,
                  borderRadius: 'var(--bk-btn-radius, 6px)',
                }}
              >
                Sign now
              </button>
              <button
                type="button"
                onClick={onDeferForms}
                className="px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98]"
                style={{
                  color: theme.textColor,
                  borderRadius: 'var(--bk-btn-radius, 6px)',
                  border: `1px solid ${theme.borderColor}`,
                }}
              >
                I'll sign at check-in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

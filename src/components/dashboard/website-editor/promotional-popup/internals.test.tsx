/**
 * Locks the overflow-detection table for the promotional popup editor.
 *
 * `collectOverflows` is the single source of truth shared by:
 *   - the live `<CharCounter>` swatches (UI-side warning)
 *   - the Save handler's confirmation toast (data-loss guard)
 *
 * The matrix is small but easy to silently break when Wave 2's sub-tab IA
 * refactor moves field rendering around — three fields × three layouts ×
 * two verbs ("truncate" for banner's hard cut vs. "wrap past the safe limit"
 * for the soft modal/corner-card cap). Locking it here means a future contributor
 * who tweaks one ceiling sees red immediately instead of finding out via a
 * shipped popup that ate the headline.
 */
import { describe, it, expect } from 'vitest';
import { collectOverflows, HEADLINE_CEILINGS, BODY_CEILINGS, DISCLAIMER_CEILING } from './internals';
import { DEFAULT_PROMO_POPUP } from '@/hooks/usePromotionalPopup';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';

const make = (overrides: Partial<PromotionalPopupSettings>): PromotionalPopupSettings => ({
  ...DEFAULT_PROMO_POPUP,
  ...overrides,
});

describe('collectOverflows', () => {
  it('returns no findings when all fields are within ceilings', () => {
    expect(collectOverflows(make({ appearance: 'modal', headline: 'Hi', body: 'Body', disclaimer: '' }))).toEqual([]);
  });

  describe.each(['modal', 'banner', 'corner-card'] as const)('appearance=%s', (appearance) => {
    const verb = appearance === 'banner' ? 'truncate' : 'wrap past the safe limit';
    const layoutLabel = appearance === 'corner-card' ? 'corner card' : appearance;

    it(`flags headline overflow with verb "${verb}"`, () => {
      const headline = 'x'.repeat(HEADLINE_CEILINGS[appearance] + 1);
      const findings = collectOverflows(make({ appearance, headline, body: '', disclaimer: '' }));
      const headlineFinding = findings.find((f) => f.field === 'headline');
      expect(headlineFinding).toBeDefined();
      expect(headlineFinding!.message).toContain(verb);
      expect(headlineFinding!.message).toContain(layoutLabel);
      expect(headlineFinding!.message).toContain(`${headline.length}/${HEADLINE_CEILINGS[appearance]}`);
    });

    it(`flags body overflow with verb "${verb}"`, () => {
      const body = 'x'.repeat(BODY_CEILINGS[appearance] + 1);
      const findings = collectOverflows(make({ appearance, headline: '', body, disclaimer: '' }));
      const bodyFinding = findings.find((f) => f.field === 'body');
      expect(bodyFinding).toBeDefined();
      expect(bodyFinding!.message).toContain(verb);
      expect(bodyFinding!.message).toContain(layoutLabel);
    });

    it('does not flag headline / body at exactly the ceiling', () => {
      const findings = collectOverflows(
        make({
          appearance,
          headline: 'x'.repeat(HEADLINE_CEILINGS[appearance]),
          body: 'x'.repeat(BODY_CEILINGS[appearance]),
          disclaimer: '',
        }),
      );
      expect(findings.find((f) => f.field === 'headline')).toBeUndefined();
      expect(findings.find((f) => f.field === 'body')).toBeUndefined();
    });
  });

  it('flags disclaimer overflow with the legal-copy message (layout-independent)', () => {
    const disclaimer = 'x'.repeat(DISCLAIMER_CEILING + 1);
    const findings = collectOverflows(make({ appearance: 'modal', headline: '', body: '', disclaimer }));
    const f = findings.find((d) => d.field === 'disclaimer');
    expect(f).toBeDefined();
    expect(f!.message).toContain('exceeds the legal-copy limit');
    expect(f!.message).toContain(`${disclaimer.length}/${DISCLAIMER_CEILING}`);
  });

  it('treats undefined disclaimer as length 0', () => {
    const findings = collectOverflows(make({ appearance: 'modal', headline: '', body: '', disclaimer: undefined }));
    expect(findings.find((f) => f.field === 'disclaimer')).toBeUndefined();
  });

  it('collects multiple findings in a single pass', () => {
    const findings = collectOverflows(
      make({
        appearance: 'banner',
        headline: 'x'.repeat(HEADLINE_CEILINGS.banner + 5),
        body: 'x'.repeat(BODY_CEILINGS.banner + 5),
        disclaimer: 'x'.repeat(DISCLAIMER_CEILING + 5),
      }),
    );
    expect(findings.map((f) => f.field).sort()).toEqual(['body', 'disclaimer', 'headline']);
  });
});

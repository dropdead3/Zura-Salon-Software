import React from 'react';
import { Link } from 'react-router-dom';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { normalizeGuidanceRoute, isValidGuidanceRoute } from '@/utils/guidanceRoutes';

const LINK_CLASS = 'text-primary underline decoration-primary/40 hover:decoration-primary underline-offset-2 font-medium';

/**
 * Matches common currency patterns: $1,234.56, €1.234,56, £1,234, ¥1234, C$1,234, etc.
 * Handles prefixed symbols ($, €, £, ¥, C$, A$, NZ$, MX$, R$) and optional decimals/k suffix.
 */
const CURRENCY_PATTERN = /((?:C\$|A\$|NZ\$|MX\$|R\$|[$€£¥])[\d.,]+k?)/g;
const CURRENCY_TEST = /^(?:C\$|A\$|NZ\$|MX\$|R\$|[$€£¥])[\d.,]+k?$/;

function blurFinancialValues(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(CURRENCY_PATTERN);
  return parts.map((part, i) => {
    if (CURRENCY_TEST.test(part)) {
      return <BlurredAmount key={i}>{part}</BlurredAmount>;
    }
    return part;
  });
}

function renderBlurredText(blurred: React.ReactNode[]) {
  return (
    <>
      {blurred.map((node, i) => (
        <React.Fragment key={i}>{node}</React.Fragment>
      ))}
    </>
  );
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export interface InsightDescriptionWithLinksProps {
  description: string;
  className?: string;
}

/**
 * Renders insight/action description text with Markdown-style [text](url) links
 * as clickable hyperlinks (label only visible) and blurs dollar amounts in plain text.
 */
export function InsightDescriptionWithLinks({ description, className }: InsightDescriptionWithLinksProps) {
  const segments: { type: 'text' | 'link'; key: string; content: React.ReactNode }[] = [];
  let lastIndex = 0;
  let matchCount = 0;
  let m: RegExpExecArray | null;

  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((m = MARKDOWN_LINK_RE.exec(description)) !== null) {
    const label = m[1]?.trim() ?? '';
    const href = m[2]?.trim() ?? '';
    const textBefore = description.slice(lastIndex, m.index);
    if (textBefore) {
      const blurred = blurFinancialValues(textBefore);
      segments.push({ type: 'text', key: `text-${segments.length}`, content: renderBlurredText(blurred) });
    }
    if (label && href) {
      const isInternal = href.startsWith('/dashboard');
      if (isInternal) {
        const normalized = normalizeGuidanceRoute(href);
        if (isValidGuidanceRoute(normalized)) {
          segments.push({
            type: 'link',
            key: `link-${matchCount}`,
            content: (
              <Link to={normalized} className={LINK_CLASS}>
                {label}
              </Link>
            ),
          });
        } else {
          segments.push({ type: 'text', key: `link-fallback-${matchCount}`, content: label });
        }
      } else {
        segments.push({
          type: 'link',
          key: `link-${matchCount}`,
          content: (
            <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {label}
            </a>
          ),
        });
      }
      matchCount += 1;
    }
    lastIndex = MARKDOWN_LINK_RE.lastIndex;
  }

  const textAfter = description.slice(lastIndex);
  if (textAfter) {
    const blurred = blurFinancialValues(textAfter);
    segments.push({ type: 'text', key: `text-${segments.length}`, content: renderBlurredText(blurred) });
  }

  if (segments.length === 0) {
    const blurred = blurFinancialValues(description);
    return <span className={className}>{renderBlurredText(blurred)}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg) => (
        <span key={seg.key}>{seg.content}</span>
      ))}
    </span>
  );
}

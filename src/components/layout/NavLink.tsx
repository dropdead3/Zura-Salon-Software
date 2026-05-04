import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Pure, hook-free shared link primitive used by Header and Footer (Preview-Live
 * Parity Pattern). Routes external URLs (http://, https://, mailto:, tel:) and
 * any item flagged `openInNewTab` through a real `<a>` with `target="_blank"`
 * + `rel="noopener noreferrer"`. Internal paths use react-router `<Link>`.
 *
 * Centralizes the open-in-new-tab + external-URL contract so the Navigation
 * Editor's `open_in_new_tab` toggle has a single rendering anchor.
 */
export interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  openInNewTab?: boolean;
  children: ReactNode;
}

const EXTERNAL_PROTOCOL = /^(https?:|mailto:|tel:)/i;

function isExternalHref(href: string): boolean {
  return EXTERNAL_PROTOCOL.test(href) || href.startsWith('//');
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, openInNewTab, children, ...rest },
  ref,
) {
  const external = isExternalHref(to);
  // Anchor-only refs (`#section`) and any external href short-circuit the router.
  if (external || openInNewTab || to.startsWith('#')) {
    const target = openInNewTab || external ? '_blank' : undefined;
    const rel = target === '_blank' ? 'noopener noreferrer' : rest.rel;
    return (
      <a ref={ref} href={to} {...rest} target={target} rel={rel}>
        {children}
      </a>
    );
  }
  return (
    <Link ref={ref} to={to} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </Link>
  );
});

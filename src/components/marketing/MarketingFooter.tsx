import { Link } from 'react-router-dom';
import { PLATFORM_NAME_FULL, PLATFORM_DESCRIPTOR } from '@/lib/brand';
import { PlatformLogo } from '@/components/brand/PlatformLogo';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Platform', href: '/product' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Ecosystem', href: '/ecosystem' },
      { label: 'Interactive Demo', href: '/explore' },
      { label: 'Request Demo', href: '/demo' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Independent Stylists', href: '/solutions/independent' },
      { label: 'Salon Owners', href: '/solutions/salon-owner' },
      { label: 'Multi-Location', href: '/solutions/multi-location' },
      { label: 'Enterprise', href: '/solutions/enterprise' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Sign In', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="col-span-2">
            <PlatformLogo variant="landing" className="h-5 mb-4" />
            <p className="font-sans text-sm text-slate-500 max-w-xs leading-relaxed">
              {PLATFORM_DESCRIPTOR}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-xs tracking-[0.15em] text-slate-400 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="font-sans text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.04] text-center">
          <p className="font-sans text-xs text-slate-600">
            &copy; {new Date().getFullYear()} {PLATFORM_NAME_FULL}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

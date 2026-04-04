import { Link } from 'react-router-dom';
import { PLATFORM_NAME_FULL } from '@/lib/brand';
import { PlatformLogo } from '@/components/brand/PlatformLogo';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <PlatformLogo variant="landing" className="h-5" />
          <div className="flex items-center gap-6">
            <Link to="/product" className="font-sans text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Product
            </Link>
            <Link to="/ecosystem" className="font-sans text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Ecosystem
            </Link>
            <Link to="/login" className="font-sans text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/[0.04] text-center">
          <p className="font-sans text-xs text-slate-600">
            &copy; {new Date().getFullYear()} {PLATFORM_NAME_FULL}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

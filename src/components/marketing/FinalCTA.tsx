import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';

export function FinalCTA() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <div className="absolute inset-0 bg-violet-500/5 rounded-3xl blur-[80px] -z-10" />
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-6">
          See what {PLATFORM_NAME} sees in your business
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10">
          Request a walkthrough. We will show you the levers hiding in your operations.
        </p>
        <Link
          to="/demo"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
        >
          Request a Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

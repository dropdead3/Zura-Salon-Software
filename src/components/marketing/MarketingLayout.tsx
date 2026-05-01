import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';
import { StickyFooterBar } from '@/components/layout/StickyFooterBar';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-surface min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-[hsl(var(--mkt-midnight)/0.15)] rounded-full blur-[120px]" />
      </div>

      <MarketingNav />
      <main className="relative z-10 flex-1 pt-24">
        {children}
      </main>
      <MarketingFooter />
      <StickyFooterBar />
    </div>
  );
}

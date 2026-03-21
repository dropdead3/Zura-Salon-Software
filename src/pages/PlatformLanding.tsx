import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BarChart3, Users, Calendar, Shield, Zap, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PLATFORM_NAME, PLATFORM_NAME_FULL } from '@/lib/brand';

export default function PlatformLanding() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
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
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-medium tracking-tight">{PLATFORM_NAME}</span>
        </div>
        <nav className="flex items-center gap-6">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center max-w-4xl mx-auto -mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-sm mb-8">
          <Zap className="w-3.5 h-3.5" />
          Salon Management Platform
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1] mb-6">
          Run your salon{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            smarter
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          The all-in-one platform for salon operations, team management, analytics, and client engagement. Built for modern beauty businesses.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-base font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-base font-medium transition-colors"
          >
            View Demo
          </Link>
        </div>
      </main>

      {/* Features grid */}
      <section className="relative z-10 px-8 py-24 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart3,
              title: 'Analytics & Insights',
              description: 'Real-time dashboards, sales tracking, and AI-powered business intelligence.',
            },
            {
              icon: Users,
              title: 'Team Management',
              description: 'Scheduling, training, performance tracking, and team communication tools.',
            },
            {
              icon: Calendar,
              title: 'Booking & Scheduling',
              description: 'Online booking, calendar management, and automated client reminders.',
            },
            {
              icon: Shield,
              title: 'Multi-Location Support',
              description: 'Manage multiple locations from a single dashboard with role-based access.',
            },
            {
              icon: Globe,
              title: 'Custom Website',
              description: 'Each organization gets a branded public-facing website and booking page.',
            },
            {
              icon: Zap,
              title: 'Automations',
              description: 'Automated reminders, client follow-ups, rent invoicing, and more.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-colors"
            >
              <feature.icon className="w-8 h-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center border-t border-white/[0.06]">
        <p className="text-sm text-slate-600">
          &copy; {new Date().getFullYear()} {PLATFORM_NAME_FULL}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

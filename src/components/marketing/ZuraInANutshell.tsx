import { PLATFORM_NAME } from '@/lib/brand';
import {
  Users, Calendar, CreditCard, BarChart3, UserPlus,
  DollarSign, MessageCircle, Globe, Check, Star,
  ArrowRight, Send, TrendingUp, Clock, Smile,
} from 'lucide-react';

/* ─── Mockup: Client Management (CRM) ──────────────────────────────── */
function CRMMockup() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
      {/* Client header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-display text-sm">JR</div>
        <div>
          <p className="text-white font-display text-sm tracking-wide">JESSICA RODRIGUEZ</p>
          <p className="text-slate-500 text-xs font-sans">VIP · Since 2021</p>
        </div>
        <span className="ml-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-sans">Retained</span>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Visits', value: '47' },
          { label: 'Lifetime', value: '$8,240' },
          { label: 'Avg Ticket', value: '$175' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
            <p className="text-white font-display text-sm tracking-wide">{s.value}</p>
            <p className="text-slate-500 text-[10px] font-sans mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Notes preview */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
        <p className="text-slate-500 text-[10px] font-sans mb-1">LATEST NOTE</p>
        <p className="text-slate-400 text-xs font-sans leading-relaxed">Prefers balayage with cool tones. Allergic to PPD — use alternative color line. Always books with Sarah.</p>
      </div>
    </div>
  );
}

/* ─── Mockup: Scheduling ───────────────────────────────────────────── */
function SchedulingMockup() {
  const hours = ['9 AM', '10', '11', '12 PM', '1', '2', '3', '4'];
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-display text-xs tracking-wide">TUESDAY, APR 8</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-sans">Utilization</span>
          <span className="text-emerald-400 font-display text-xs">87%</span>
        </div>
      </div>
      {/* Mini calendar grid */}
      <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-px text-[10px]">
        <div />
        {['Sarah', 'Mike', 'Luna'].map((n) => (
          <p key={n} className="text-slate-500 font-sans text-center pb-1">{n}</p>
        ))}
        {hours.map((h, i) => (
          <div key={h} className="contents">
            <p className="text-slate-600 font-sans pr-2 text-right py-1">{h}</p>
            {[0, 1, 2].map((col) => {
              const filled =
                (col === 0 && (i >= 0 && i <= 2)) ||
                (col === 0 && (i >= 4 && i <= 6)) ||
                (col === 1 && (i >= 1 && i <= 3)) ||
                (col === 1 && (i >= 5 && i <= 7)) ||
                (col === 2 && (i >= 0 && i <= 1)) ||
                (col === 2 && (i >= 3 && i <= 5));
              const colors = ['bg-violet-500/20', 'bg-sky-500/20', 'bg-amber-500/20'];
              return (
                <div
                  key={col}
                  className={`h-5 rounded-sm ${filled ? colors[col] : 'bg-white/[0.02]'} border border-white/[0.04]`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Mockup: Point of Sale ────────────────────────────────────────── */
function POSMockup() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <p className="text-white font-display text-xs tracking-wide">TRANSACTION #4821</p>
      <div className="space-y-2">
        {[
          { service: 'Balayage + Toner', price: '$185' },
          { service: 'Olaplex Treatment', price: '$45' },
          { service: 'Blowout & Style', price: '$55' },
        ].map((item) => (
          <div key={item.service} className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-slate-400 text-xs font-sans">{item.service}</span>
            <span className="text-white text-xs font-display tracking-wide">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-1">
        <span className="text-slate-500 text-xs font-sans">Tip</span>
        <span className="text-emerald-400 text-xs font-display">+$42</span>
      </div>
      <div className="flex justify-between items-center rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
        <span className="text-slate-400 text-xs font-sans">Total</span>
        <span className="text-white font-display text-base tracking-wide">$327</span>
      </div>
      <div className="flex items-center gap-2">
        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-slate-500 text-[10px] font-sans">Visa •••• 4242 · Approved</span>
      </div>
    </div>
  );
}

/* ─── Mockup: Analytics & Reporting ────────────────────────────────── */
function AnalyticsMockup() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
      <p className="text-white font-display text-xs tracking-wide">WEEKLY SNAPSHOT</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Revenue', value: '$24.8K', change: '+12%', up: true },
          { label: 'Utilization', value: '84%', change: '+3%', up: true },
          { label: 'Retention', value: '91%', change: '-1%', up: false },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5">
            <p className="text-slate-500 text-[10px] font-sans">{m.label}</p>
            <p className="text-white font-display text-sm tracking-wide mt-1">{m.value}</p>
            <p className={`text-[10px] font-sans mt-0.5 ${m.up ? 'text-emerald-400' : 'text-amber-400'}`}>{m.change}</p>
          </div>
        ))}
      </div>
      {/* Mini sparkline */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
        <p className="text-slate-500 text-[10px] font-sans mb-2">REVENUE TREND</p>
        <div className="flex items-end gap-1 h-8">
          {[40, 55, 45, 60, 70, 65, 80, 75, 85, 90, 82, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-violet-500/30"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Mockup: Onboarding & Hiring ──────────────────────────────────── */
function OnboardingMockup() {
  const steps = [
    { label: 'Application received', done: true },
    { label: 'Interview scheduled', done: true },
    { label: 'License verification', done: true },
    { label: 'Training modules', done: false, progress: '3/5' },
    { label: 'System access granted', done: false },
    { label: 'First day scheduled', done: false },
  ];
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-display text-xs tracking-wide">NEW HIRE: MAYA CHEN</p>
        <span className="text-violet-400 text-[10px] font-sans">Day 4 of 7</span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: '55%' }} />
      </div>
      <div className="space-y-1.5">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-2 py-1">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${s.done ? 'bg-emerald-500/20' : 'bg-white/[0.06]'}`}>
              {s.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </div>
            <span className={`text-xs font-sans ${s.done ? 'text-slate-400 line-through' : 'text-slate-300'}`}>{s.label}</span>
            {s.progress && <span className="ml-auto text-violet-400 text-[10px] font-sans">{s.progress}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Mockup: Payroll & Commission ─────────────────────────────────── */
function PayrollMockup() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <p className="text-white font-display text-xs tracking-wide">PAY PERIOD: MAR 24 – APR 6</p>
      <div className="space-y-2">
        {[
          { label: 'Service Commission (45%)', value: '$2,340' },
          { label: 'Retail Commission (15%)', value: '$186' },
          { label: 'Tips', value: '$890' },
          { label: 'Product Charge Deduction', value: '-$124' },
        ].map((r) => (
          <div key={r.label} className="flex justify-between items-center py-1 border-b border-white/[0.04]">
            <span className="text-slate-400 text-xs font-sans">{r.label}</span>
            <span className={`text-xs font-display tracking-wide ${r.value.startsWith('-') ? 'text-amber-400' : 'text-white'}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 p-3">
        <span className="text-slate-300 text-xs font-sans">Total Payout</span>
        <span className="text-emerald-400 font-display text-base tracking-wide">$3,292</span>
      </div>
    </div>
  );
}

/* ─── Mockup: Team Chat ────────────────────────────────────────────── */
function TeamChatMockup() {
  const messages = [
    { name: 'Sarah', initials: 'SM', color: 'bg-violet-500/20 text-violet-400', text: 'My 2pm cancelled — anyone need an assist?', time: '1:42 PM' },
    { name: 'Mike', initials: 'MR', color: 'bg-sky-500/20 text-sky-400', text: 'Yes! I have a double process at 2. Would love help 🙏', time: '1:43 PM' },
    { name: 'Luna', initials: 'LK', color: 'bg-amber-500/20 text-amber-400', text: 'FYI — backbar is low on 20vol developer', time: '1:45 PM' },
  ];
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
        <p className="text-white font-display text-xs tracking-wide"># FLOOR CHAT</p>
        <span className="ml-auto text-slate-600 text-[10px] font-sans">3 online</span>
      </div>
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.time} className="flex gap-2.5">
            <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[10px] font-display shrink-0`}>{m.initials}</div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-xs font-sans">{m.name}</span>
                <span className="text-slate-600 text-[10px] font-sans">{m.time}</span>
              </div>
              <p className="text-slate-400 text-xs font-sans leading-relaxed mt-0.5">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 flex items-center gap-2">
        <span className="text-slate-600 text-xs font-sans">Type a message...</span>
        <Send className="w-3.5 h-3.5 text-slate-600 ml-auto" />
      </div>
    </div>
  );
}

/* ─── Mockup: Website Builder ──────────────────────────────────────── */
function WebsiteMockup() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
        <div className="ml-3 flex-1 rounded bg-white/[0.04] px-3 py-1">
          <span className="text-slate-600 text-[10px] font-sans">luminasalon.com</span>
        </div>
      </div>
      {/* Page content */}
      <div className="p-5 space-y-4">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <span className="text-white font-display text-xs tracking-wide">LUMINA SALON</span>
          <div className="flex gap-3">
            {['Services', 'Team', 'Book'].map((l) => (
              <span key={l} className="text-slate-500 text-[10px] font-sans">{l}</span>
            ))}
          </div>
        </div>
        {/* Hero block */}
        <div className="rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-white/[0.06] p-4 text-center space-y-2">
          <p className="text-white font-display text-sm tracking-wide">YOUR STYLE. ELEVATED.</p>
          <p className="text-slate-400 text-[10px] font-sans">Award-winning color, cuts & extensions in downtown Austin.</p>
          <div className="inline-block rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-1.5">
            <span className="text-white text-[10px] font-sans">Book Now</span>
          </div>
        </div>
        {/* Services grid */}
        <div className="grid grid-cols-3 gap-2">
          {['Balayage', 'Extensions', 'Treatments'].map((s) => (
            <div key={s} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2 text-center">
              <div className="w-full h-6 rounded bg-white/[0.04] mb-1.5" />
              <span className="text-slate-400 text-[10px] font-sans">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Feature data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    pill: 'Client Management',
    icon: Users,
    headline: 'Know every client. Not just their name.',
    description: 'Full client profiles with visit history, lifetime value, preferences, allergies, and notes — accessible to every team member at the chair.',
    Mockup: CRMMockup,
  },
  {
    pill: 'Scheduling',
    icon: Calendar,
    headline: 'Your book, optimized automatically.',
    description: 'Visual appointment grid with real-time utilization tracking, gap detection, and smart rebooking prompts — so no chair sits empty.',
    Mockup: SchedulingMockup,
  },
  {
    pill: 'Point of Sale',
    icon: CreditCard,
    headline: 'Ring up. Track. Move on.',
    description: 'Service line items, retail, tips, and payments — all captured in one transaction. No double entry, no reconciliation headaches.',
    Mockup: POSMockup,
  },
  {
    pill: 'Analytics & Reporting',
    icon: BarChart3,
    headline: 'See what\'s actually happening.',
    description: 'Revenue, utilization, retention, and staff performance — all in one weekly snapshot. Know exactly which lever to pull next.',
    Mockup: AnalyticsMockup,
  },
  {
    pill: 'Onboarding & Hiring',
    icon: UserPlus,
    headline: 'From hire to chair in days, not weeks.',
    description: 'Structured onboarding checklists, license verification, training modules, and system access — automated so nothing falls through the cracks.',
    Mockup: OnboardingMockup,
  },
  {
    pill: 'Payroll & Commission',
    icon: DollarSign,
    headline: 'Pay your team right. Every time.',
    description: 'Tiered commission models, tip distribution, product charge deductions, and payout summaries — calculated automatically, audit-ready.',
    Mockup: PayrollMockup,
  },
  {
    pill: 'Team Chat',
    icon: MessageCircle,
    headline: 'One place for your team to talk.',
    description: 'Floor chat, announcements, and direct messages — so your team stops texting on personal phones and everything stays in one place.',
    Mockup: TeamChatMockup,
  },
  {
    pill: 'Website Builder',
    icon: Globe,
    headline: 'Your front door. Always on brand.',
    description: 'A beautiful, bookable website that stays in sync with your services, team, and availability — no developer needed.',
    Mockup: WebsiteMockup,
  },
];

/* ─── Main Section ─────────────────────────────────────────────────── */
export function ZuraInANutshell() {
  return (
    <section className="relative z-10 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* Section header */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="font-display text-xs tracking-[0.2em] text-violet-400 mb-3">
            {PLATFORM_NAME.toUpperCase()} IN A NUTSHELL
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight mb-4">
            Everything your salon runs on. One platform.
          </h2>
          <p className="font-sans text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Built for operators who need real tools — not another app to manage.
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-16 sm:space-y-24">
          {FEATURES.map((feature, index) => {
            const isEven = index % 2 === 1;
            const Icon = feature.icon;
            const Mockup = feature.Mockup;
            return (
              <div key={feature.pill} className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Text side */}
                <div className={`space-y-4 ${isEven ? 'md:order-2' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 font-sans">
                      {feature.pill}
                    </span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl text-white tracking-tight">
                    {feature.headline}
                  </h3>
                  <p className="font-sans text-sm sm:text-base text-slate-400 leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </div>
                {/* Visual side */}
                <div className={isEven ? 'md:order-1' : ''}>
                  <Mockup />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Send, Building2, Sparkles } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';

const locationOptions = ['1 location', '2–5 locations', '6–15 locations', '16+ locations'];
const challengeOptions = [
  'Margin visibility',
  'Scaling without chaos',
  'Stylist retention & performance',
  'Replacing multiple tools',
  'Other',
];

export default function ProductDemo() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', locations: '', challenge: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const isValid = form.name && form.email && form.locations && form.challenge;

  return (
    <MarketingLayout>
      <section className="px-6 sm:px-8 py-16 sm:py-24 lg:py-32">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 font-sans text-sm text-slate-500 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {!submitted ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-6">
                  <Sparkles className="w-3.5 h-3.5" />
                  15-Minute Walkthrough
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-4">
                  See {PLATFORM_NAME} in Action
                </h1>
                <p className="font-sans text-base sm:text-lg text-slate-400 max-w-lg mx-auto">
                  Tell us about your business and we will show you the exact levers waiting inside your operations.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 rounded-2xl mkt-glass mkt-border-shimmer space-y-6">
                {/* Name */}
                <div>
                  <label className="block font-sans text-sm text-slate-300 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-sans text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                    placeholder="Jane Smith"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-sans text-sm text-slate-300 mb-2">Work Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-sans text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                    placeholder="jane@salon.com"
                  />
                </div>

                {/* Locations */}
                <div>
                  <label className="block font-sans text-sm text-slate-300 mb-2">Number of Locations</label>
                  <div className="grid grid-cols-2 gap-2">
                    {locationOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm({ ...form, locations: opt })}
                        className={`h-10 px-4 rounded-xl border font-sans text-sm transition-all ${
                          form.locations === opt
                            ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                            : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Challenge */}
                <div>
                  <label className="block font-sans text-sm text-slate-300 mb-2">Biggest Challenge</label>
                  <div className="flex flex-wrap gap-2">
                    {challengeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm({ ...form, challenge: opt })}
                        className={`h-9 px-4 rounded-full border font-sans text-sm transition-all ${
                          form.challenge === opt
                            ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                            : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/[0.15]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-sans text-base font-medium text-white transition-all shadow-lg shadow-violet-500/20 inline-flex items-center justify-center gap-2"
                >
                  Request Walkthrough
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-4">
                We will be in touch
              </h2>
              <p className="font-sans text-base text-slate-400 max-w-md mx-auto mb-8">
                Our team will reach out within 24 hours to schedule your personalized walkthrough.
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 h-12 px-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-sans text-base font-medium transition-colors"
              >
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Send, Building2, Sparkles, Loader2 } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingSEO } from '@/components/marketing/MarketingSEO';
import { captureWebsiteLead } from '@/lib/leadCapture';
import { toast } from '@/hooks/use-toast';

const locationOptions = ['1 location', '2–5 locations', '6–15 locations', '16+ locations'];
const challengeOptions = [
  'Seeing what\'s actually profitable',
  'Growing without losing control',
  'Keeping great people',
  'Replacing too many tools',
  'Other',
];

export default function ProductDemo() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', locations: '', challenge: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = form.name.trim() && form.email.trim() && form.locations && form.challenge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const result = await captureWebsiteLead({
      name: form.name.trim(),
      email: form.email.trim(),
      location: form.locations,
      service: form.challenge,
      referralSource: 'Platform Demo Request',
      message: `Locations: ${form.locations} | Challenge: ${form.challenge}`,
    });
    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      toast({ title: 'Something went wrong', description: 'Please try again or email us directly.', variant: 'destructive' });
    }
  };

  return (
    <MarketingLayout>
      <MarketingSEO
        title="Request a Demo"
        description={`See ${PLATFORM_NAME} in action. Get a personalized walkthrough of the salon intelligence platform built for scaling operators.`}
        path="/demo"
      />
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
                  Tell us a bit about your salon and we'll show you how {PLATFORM_NAME} can help you run it with more clarity.
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
                    maxLength={100}
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
                    maxLength={255}
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
                  disabled={!isValid || loading}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-sans text-base font-medium text-white transition-all shadow-lg shadow-violet-500/20 inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Get a Demo
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-4">
                We'll be in touch
              </h2>
              <p className="font-sans text-base text-slate-400 max-w-md mx-auto mb-8">
                Our team will reach out within 24 hours to schedule your walkthrough.
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

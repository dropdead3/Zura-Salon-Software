import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { useScrollReveal } from '@/components/marketing/useScrollReveal';
import { PLATFORM_NAME } from '@/lib/brand';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const tiers = [
  {
    name: 'Solo',
    price: '$99',
    period: '/mo',
    audience: 'For single-location salons with up to 4 team members.',
    cta: 'Start Free Trial',
    ctaHref: '/demo',
    popular: false,
    features: [
      'Full performance dashboard',
      'Scheduling & booking tools',
      'Smart recommendations each week',
      'Commission tracking & pay setup',
      'Team tools for up to 4 people',
      'Client retention insights',
    ],
  },
  {
    name: 'Multi-Location',
    price: '$200',
    period: '/location/mo',
    audience: 'For growing brands with 2–15 locations.',
    cta: 'Start Free Trial',
    ctaHref: '/demo',
    popular: true,
    features: [
      'Everything in Solo',
      'Cross-location benchmarking',
      'Performance tracking across teams',
      'Up to 10 users per location',
      'Manager & owner dashboards',
      'Scheduling & coverage tools',
      'Marketing campaign tracking',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    audience: 'For established brands with 16+ locations.',
    cta: 'Contact Us',
    ctaHref: '/demo',
    popular: false,
    features: [
      'Everything in Multi-Location',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced forecasting & reporting',
      'Regional benchmarking',
      'Custom training & onboarding',
      'SLA-backed support',
    ],
  },
];

const faqs = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — every plan starts with a free 14-day trial. No credit card required to get started.',
  },
  {
    q: 'Are there any setup fees?',
    a: `There's a one-time $199 setup fee that covers onboarding and data migration. We waive it frequently — ask us about current promotions.`,
  },
  {
    q: 'What happens when I add a new location?',
    a: 'You automatically move to Multi-Location pricing. Each new location is $200/mo and includes 10 team member seats.',
  },
  {
    q: 'Can I cancel anytime?',
    a: `Yes. ${PLATFORM_NAME} is month-to-month with no long-term contracts. Cancel anytime from your account settings.`,
  },
  {
    q: 'What's included in the dashboard?',
    a: 'Every plan includes real-time performance data, smart weekly recommendations, commission tracking, client retention insights, and team management tools — scaled to your size.',
  },
];

export default function Pricing() {
  const ref = useScrollReveal();

  return (
    <MarketingLayout>
      <Helmet>
        <title>Pricing — {PLATFORM_NAME}</title>
        <meta
          name="description"
          content={`Simple, transparent pricing that grows with your salon. Plans start at $99/mo for solo locations.`}
        />
      </Helmet>

      <div ref={ref}>
        {/* Header */}
        <section className="pt-16 pb-12 text-center px-6">
          <h1 className="mkt-reveal font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white mb-4">
            Simple pricing that grows with you
          </h1>
          <p className="mkt-reveal font-sans text-lg text-slate-400 max-w-xl mx-auto">
            One system for your whole salon — whether you have one chair or one hundred.
          </p>
        </section>

        {/* Tier Cards */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`mkt-reveal relative flex flex-col rounded-2xl border p-8 transition-all ${
                  tier.popular
                    ? 'border-violet-500/40 bg-violet-500/[0.06] shadow-lg shadow-violet-500/10'
                    : 'border-white/[0.08] bg-white/[0.02]'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-violet-600 font-sans text-xs font-medium text-white shadow-lg shadow-violet-500/30">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                )}

                <h2 className="font-display text-lg tracking-wide text-white mb-1">
                  {tier.name}
                </h2>
                <p className="font-sans text-sm text-slate-500 mb-6">
                  {tier.audience}
                </p>

                <div className="mb-8">
                  <span className="font-display text-4xl text-white">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="font-sans text-sm text-slate-500 ml-1">
                      {tier.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                      <span className="font-sans text-sm text-slate-300">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.ctaHref}
                  className={`inline-flex items-center justify-center gap-2 h-11 rounded-full font-sans text-sm font-medium transition-all ${
                    tier.popular
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20'
                      : 'border border-white/[0.12] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 sm:px-8 pb-20">
          <h2 className="mkt-reveal font-display text-2xl tracking-wide text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="mkt-reveal border-white/[0.08] rounded-xl px-6 bg-white/[0.02]"
              >
                <AccordionTrigger className="font-sans text-sm text-slate-200 hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="font-sans text-sm text-slate-400 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Bottom CTA */}
        <section className="text-center px-6 pb-24">
          <p className="mkt-reveal font-sans text-slate-400 mb-4">
            Not sure which plan fits? Let us walk you through it.
          </p>
          <Link
            to="/demo"
            className="mkt-reveal inline-flex items-center gap-2 h-11 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-sm font-medium text-white transition-all shadow-lg shadow-violet-500/20"
          >
            Request a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </MarketingLayout>
  );
}

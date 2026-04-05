import { DollarSign, CalendarCheck, Heart, Wallet, Megaphone } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function IndependentStylist() {
  return (
    <SolutionPageTemplate
      eyebrow="For Independent Stylists"
      headline="Build your business with clarity — from chair one."
      description="You're building something real behind the chair. Zura gives you the visibility to price right, book smart, and grow on your terms."
      seoTitle="For Independent Stylists"
      seoDescription="Build your salon business with clarity — pricing, booking, and growth tools from chair one."
      seoPath="/solutions/independent-stylist"
      items={[
        {
          icon: DollarSign,
          problem: "I don't know if I'm pricing right",
          solution: "See exactly how much you make per service after product cost and time. Adjust pricing with confidence — not guesswork.",
          stat: "Owners raise margins 12–18% in the first quarter",
        },
        {
          icon: CalendarCheck,
          problem: "My calendar has too many gaps",
          solution: "Spot booking gaps before they happen. Smart recommendations help you rebook clients and fill open slots without discounting.",
          stat: "Reduce calendar gaps by up to 30%",
        },
        {
          icon: Heart,
          problem: "Clients leave and I don't know why",
          solution: "Track which clients haven't rebooked and why. Get alerts before they leave — so you can reach out while it still matters.",
          stat: "Retain 15% more clients year over year",
        },
        {
          icon: Wallet,
          problem: "I can't see where my money goes",
          solution: "One view of your income, expenses, and take-home pay. No more guessing what you actually made this month.",
          stat: "Save 5+ hours/month on bookkeeping",
        },
        {
          icon: Megaphone,
          problem: "Marketing feels like guessing",
          solution: "Know which promotions actually bring clients back and which waste money. Spend on what works — automatically.",
          stat: "Cut wasted ad spend by up to 40%",
        },
      ]}
      testimonial={{
        quote: "I finally know what I'm actually making. That changed everything about how I price and plan.",
        attribution: "Independent Stylist",
        detail: "Solo chair",
      }}
    />
  );
}

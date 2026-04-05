import { CalendarCheck, Clock, RefreshCw, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function Scheduling() {
  return (
    <SolutionPageTemplate
      eyebrow="Smart Scheduling"
      headline="A full book is good. A smart book is better."
      description="Your calendar should work for you — not against you. See gaps before they happen, rebook with purpose, and keep every chair productive."
      items={[
        {
          icon: CalendarCheck,
          problem: "My calendar has too many gaps",
          solution: "Spot booking gaps before they happen. Smart recommendations help you rebook clients and fill open slots without discounting.",
          stat: "Reduce calendar gaps by up to 30%",
        },
        {
          icon: Clock,
          problem: "Services run over and stack up",
          solution: "Track actual service durations against booked time. Adjust scheduling templates so your day flows the way it should.",
        },
        {
          icon: RefreshCw,
          problem: "Clients aren't rebooking",
          solution: "See exactly which clients left without their next appointment. Automated nudges help bring them back before they forget.",
          stat: "Increase rebooking rates by up to 25%",
        },
        {
          icon: BarChart3,
          problem: "I don't know my real utilization",
          solution: "See how much of your available chair time is actually booked — by stylist, by day, by location. No more guessing if you're busy or just moving.",
        },
        {
          icon: Users,
          problem: "Some stylists are overbooked, others are empty",
          solution: "Balance your team's workload with visibility into who's fully booked and who has room to grow.",
        },
        {
          icon: AlertTriangle,
          problem: "No-shows and cancellations cost me money",
          solution: "Track patterns, flag repeat offenders, and enforce deposit policies that protect your revenue.",
          stat: "Reduce no-shows by up to 40%",
        },
      ]}
      testimonial={{
        quote: "We went from guessing why Tuesdays were slow to actually understanding our booking patterns. Gaps dropped within the first month.",
        attribution: "Salon Owner",
        detail: "2 locations",
      }}
    />
  );
}

import { DollarSign, UserPlus, GraduationCap, BarChart3, Coffee, Heart } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function SalonOwner() {
  return (
    <SolutionPageTemplate
      eyebrow="For Salon Owners"
      headline="Run your team with confidence, not guesswork."
      description="You built something great. Now you need the systems to keep it growing — without wearing every hat yourself."
      items={[
        {
          icon: DollarSign,
          problem: "Commission and pay are a mess",
          solution: "Set up transparent commission tiers your team can see. Automate calculations so payroll day is simple and dispute-free.",
          stat: "Eliminate 90% of pay disputes",
        },
        {
          icon: UserPlus,
          problem: "Hiring and keeping great people is hard",
          solution: "Build a culture where top talent stays. Performance tracking and career paths give your team real reasons to grow with you.",
          stat: "Reduce turnover by up to 25%",
        },
        {
          icon: GraduationCap,
          problem: "My team has no growth path",
          solution: "Build transparent performance tiers and career levels. Your team sees exactly what it takes to earn more — and stays motivated.",
          stat: "Teams with clear paths retain 2x longer",
        },
        {
          icon: BarChart3,
          problem: "I don't know my real profit per service",
          solution: "Know which services make you money and which cost you. Adjust your menu with real data instead of gut feeling.",
          stat: "Identify hidden losses within your first week",
        },
        {
          icon: Coffee,
          problem: "I can't step away without things falling apart",
          solution: "Automated alerts, structured workflows, and performance visibility mean your salon runs on systems — not just you.",
          stat: "Owners save 8+ hours/week",
        },
        {
          icon: Heart,
          problem: "Clients leave and I don't know why",
          solution: "Track which clients haven't rebooked and why. Get alerts before they leave — so you can reach out while it still matters.",
          stat: "Retain 15% more clients year over year",
        },
      ]}
      testimonial={{
        quote: "I used to spend every Monday morning in spreadsheets trying to figure out which stylist was bleeding margin. Now I open one screen and know exactly what to fix.",
        attribution: "Salon Owner",
        detail: "4 locations",
      }}
    />
  );
}

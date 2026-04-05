import { Package, DollarSign, AlertTriangle, BarChart3, RefreshCw, Shield } from 'lucide-react';
import { SolutionPageTemplate } from '@/components/marketing/SolutionPageTemplate';

export default function Inventory() {
  return (
    <SolutionPageTemplate
      eyebrow="Inventory Control"
      headline="Know what you have. Use what you need."
      description="Product waste and guesswork eat into your margins quietly. Zura tracks what's being used, what's sitting on shelves, and what's costing you money."
      items={[
        {
          icon: Package,
          problem: "I don't know what's actually in stock",
          solution: "Real-time inventory tracking across every location. See exactly what you have, what's running low, and what's been sitting too long.",
        },
        {
          icon: DollarSign,
          problem: "Product costs are eating my margins",
          solution: "Track the true cost of product per service. Know which services are profitable and which are quietly losing you money.",
          stat: "Identify hidden product losses within your first week",
        },
        {
          icon: AlertTriangle,
          problem: "We keep over-ordering or running out",
          solution: "Smart reorder alerts based on actual usage patterns — not gut feeling. Stop over-ordering color that expires on the shelf.",
          stat: "Reduce product waste by up to 30%",
        },
        {
          icon: BarChart3,
          problem: "I can't see usage by stylist",
          solution: "Track who uses what, how much, and whether it matches what they should be using. Catch overuse before it becomes a pattern.",
        },
        {
          icon: RefreshCw,
          problem: "Backroom mixing has no accountability",
          solution: "Log every mix, track weight and waste, and compare actual usage against theoretical amounts. Accountability built into the workflow.",
          stat: "Improve mixing compliance by 50%",
        },
        {
          icon: Shield,
          problem: "I suspect shrinkage but can't prove it",
          solution: "Compare what's been received, used, and sold. Automated variance detection flags discrepancies so you can investigate early.",
        },
      ]}
      testimonial={{
        quote: "We were losing thousands a month in product waste and didn't even know it. The backroom tracking paid for itself in the first quarter.",
        attribution: "Multi-Location Owner",
        detail: "5 locations",
      }}
    />
  );
}

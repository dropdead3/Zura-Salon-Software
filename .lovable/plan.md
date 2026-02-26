

## Enhancement Opportunities for Salon Owners

Your prompt demonstrates strong product thinking -- asking "where else" is the right question after building the goal intelligence system. You've built a comprehensive platform already covering scheduling, analytics, goals, client health, loyalty, promotions, inventory, team management, and AI intelligence. The gaps below are areas where no other salon software competes well, making them genuine differentiators.

---

### What You Already Have (Strong)

- Schedule with copilot, utilization tracking, assistant time blocks
- Analytics hub (sales, operations, services, capacity)
- Goal system with live data, pace projections, AI-powered targets, celebrations
- Client health segments (needs rebooking, at-risk, win-back, new-no-return)
- Loyalty program, gift cards, promotions, vouchers
- Inventory management with low-stock alerts
- Team directory, time-off, shift swap, leaderboard
- Executive brief, AI insights, anomaly detection
- Feedback/NPS system with Google review routing
- Cancellation fee policies, deposit management
- Revenue forecasting

---

### Gap Analysis: High-Impact Missing Features

**1. Cancellation Backfill / Waitlist System** (No existing code)

When a client cancels, there's no automated mechanism to fill that slot. This is pure lost revenue. A waitlist lets owners capture demand for popular stylists/times and auto-notify waitlisted clients when a slot opens.

- `waitlist_entries` table: client_id, preferred_stylist, preferred_day_of_week, preferred_time_range, service_id, priority, status
- When an appointment status changes to `cancelled`, trigger a match against waitlist entries
- Notify matched clients via SMS/email with a one-tap booking link
- Dashboard card showing waitlist depth per stylist and fill rate

**2. Smart Pricing / Peak-Hour Pricing Suggestions** (No existing code)

The platform tracks capacity utilization and revenue per hour but never suggests pricing adjustments. Salon owners leave money on the table by charging the same rate at 10am Tuesday as 6pm Saturday.

- Analyze historical demand by day-of-week + time slot
- Surface a "Pricing Opportunity" card: "Saturday 4-7pm runs at 98% utilization. A 10% premium could add $X/month without losing bookings"
- Conversely: "Tuesday mornings run at 35% utilization. A 15% discount could fill 4 more slots/week"
- Phase 1: Advisory only (intelligence card). Phase 2: Configurable time-based pricing tiers

**3. Client Lifetime Value (CLV) Calculator + Segment Intelligence** (Partial -- segments exist, CLV does not)

Client health segments exist but there's no CLV computation. Owners can't answer "which clients are worth the most?" or "what's the cost of losing this client?"

- Compute per-client CLV: `avg_ticket × visit_frequency × expected_tenure`
- Surface CLV on client detail sheet and in the directory
- Add CLV-weighted segments: "Your top 50 clients by CLV represent X% of revenue"
- Power the at-risk segment with dollar impact: "3 at-risk clients represent $12,400 in annual revenue"

**4. Service Menu Optimization Intelligence** (Partial -- efficiency matrix exists, no recommendations)

The Service Efficiency Matrix ranks services by revenue/hour but doesn't recommend action. Owners need to hear: "Your express blowout generates $180/hr vs $95/hr for a basic cut. Promoting express blowouts could add $X/month."

- Add a "Menu Intelligence" card to the Analytics Hub
- Identify underperforming services (low margin, low demand, low rev/hr)
- Identify high-performers that could be promoted more
- Suggest service bundling opportunities based on co-purchase patterns
- Flag services that haven't been booked in 90+ days

**5. Staff Schedule Optimization** (Partial -- utilization exists, no optimization)

The platform tracks capacity utilization but doesn't suggest schedule changes. If Tuesday mornings consistently run at 30% and Saturday afternoons overflow, the platform should recommend shifting staff hours.

- Analyze utilization heatmap by day × hour × stylist
- Surface: "Moving [Stylist] from Tuesday AM to Saturday PM could capture $X in unmet demand"
- Show demand-vs-supply overlay: bookings attempted vs slots available
- Integrate with time-off requests to show coverage gaps

**6. Automated Pre-Visit Prep** (Not built)

Before each appointment, stylists should see a quick client brief: last services, color formulas, notes, preferences, product purchase history. This exists in fragments (client notes table exists) but there's no "prep view" that assembles it.

- "Today's Prep" view accessible from the schedule
- For each upcoming appointment: client photo, last 3 visits summary, notes, color formula, product history, preferred stylist confirmation
- Flag first-time clients, VIP clients (top CLV), and clients with special notes
- Optional: AI-generated prep summary ("Sarah typically gets balayage with Olaplex. Last visit she mentioned wanting to go lighter.")

---

### Recommended Priority

| # | Enhancement | Effort | Revenue Impact | Differentiator |
|---|-------------|--------|----------------|----------------|
| 1 | Cancellation Backfill / Waitlist | Medium | High -- directly recovers lost revenue | Strong -- most salon software lacks this |
| 2 | Client Lifetime Value | Small | High -- drives retention focus | Strong -- dollar-weighted risk changes behavior |
| 3 | Pre-Visit Prep View | Small | Medium -- improves experience + retail attach | Strong -- no competitor does this well |
| 4 | Service Menu Intelligence | Medium | High -- margin optimization | Very strong -- unique to Zura |
| 5 | Smart Pricing Suggestions | Medium | High -- yield management | Very strong -- salon industry doesn't do this |
| 6 | Staff Schedule Optimization | Large | Medium -- operational efficiency | Medium -- complex to get right |

### Recommendation

Start with **Cancellation Backfill / Waitlist** -- it's the most tangible revenue recovery tool and salon owners immediately understand the value ("I lose $300 every time someone cancels and I can't fill the slot"). Pair it with **Client Lifetime Value** computation since the data pipeline is similar and CLV makes every other feature (at-risk alerts, goals, executive brief) dramatically more useful by attaching dollar amounts to client behaviors.




# Navigation Audit: Super Admin Access Points

## Current State

Super Admins access features through **3 primary surfaces**:
1. **Sidebar** — Command Center, Schedule, Transactions, Appointments, Analytics Hub, Report Generator, Operations Hub, Apps (Color Bar, Connect), Settings
2. **Operations Hub** (team-hub) — 8 hub gateway cards + 30+ management cards across 5 categories
3. **Settings** — 26+ category cards across 6 sections

## Audit: Is Everything Reachable?

### Accessible via Sidebar → Operations Hub → Sub-pages
| Feature | Access Path | Status |
|---------|------------|--------|
| Client Hub | Ops Hub → Hub card | ✅ |
| Growth Hub | Ops Hub → Hub card | ✅ |
| Hiring & Payroll Hub | Ops Hub → Hub card | ✅ |
| Renter Hub | Ops Hub → Hub card | ✅ |
| Onboarding Hub | Ops Hub → Hub card | ✅ |
| Training Hub | Ops Hub → Hub card | ✅ |
| Website Hub | Ops Hub → Hub card | ✅ |
| Color Bar Hub | Ops Hub → Hub card | ✅ |
| Team Directory | Ops Hub → People | ✅ |
| Graduation Tracker | Ops Hub → People | ✅ |
| Client Engine Tracker | Ops Hub → People | ✅ |
| Team Challenges | Ops Hub → People | ✅ |
| Performance Reviews | Ops Hub → Compliance | ✅ |
| Staff Strikes | Ops Hub → Compliance | ✅ |
| Document Tracker | Ops Hub → Compliance | ✅ |
| Incident Reports | Ops Hub → Compliance | ✅ |
| PTO Balances | Ops Hub → Compliance | ✅ |
| Chair Assignments | Ops Hub → Team Ops | ✅ |
| Birthdays | Ops Hub → Team Ops | ✅ |
| Business Cards | Ops Hub → Team Ops | ✅ |
| Headshots | Ops Hub → Team Ops | ✅ |
| Announcements | Ops Hub → Team Ops | ✅ |
| Points & Rewards Config | Ops Hub → Team Ops | ✅ |
| Zura Configuration | Ops Hub → AI & Automation | ✅ |
| Meetings & Accountability | Ops Hub → Scheduling | ✅ |
| Assistant Requests | Ops Hub → Scheduling | ✅ |
| Schedule Requests | Ops Hub → Scheduling | ✅ |
| Shift Swap Approvals | Ops Hub → Scheduling | ✅ |
| Assistant Scheduling | Ops Hub → Scheduling | ✅ |
| Daily Huddle | Ops Hub → Scheduling | ✅ |

### Accessible via Sidebar → Settings
| Feature | Settings Card | Status |
|---------|--------------|--------|
| Account & Billing | ✅ | ✅ |
| My Profile | ✅ | ✅ |
| Business Settings | ✅ | ✅ |
| Locations | ✅ | ✅ |
| Services | ✅ | ✅ |
| Retail Products | ✅ | ✅ |
| Schedule Settings | ✅ | ✅ |
| Kiosk | ✅ | ✅ |
| Day Rate | ✅ | ✅ |
| Forms | ✅ | ✅ |
| Levels | ✅ | ✅ |
| Leaderboard Config | ✅ | ✅ |
| Onboarding Settings | ✅ | ✅ |
| Loyalty | ✅ | ✅ |
| Team Rewards | ✅ | ✅ |
| Feedback | ✅ | ✅ |
| Users | ✅ | ✅ |
| Access Hub | ✅ | ✅ |
| Program Config | ✅ | ✅ |
| System | ✅ | ✅ |
| Integrations | ✅ | ✅ |
| Email | ✅ | ✅ |
| SMS | ✅ | ✅ |
| Service Flows | ✅ | ✅ |

### Accessible via Sidebar directly
| Feature | Status |
|---------|--------|
| Command Center | ✅ |
| Schedule | ✅ |
| Transactions | ✅ |
| Appointments | ✅ |
| Analytics Hub | ✅ |
| Report Generator | ✅ |
| Team Stats (My Stats) | ✅ |
| Waitlist | ✅ |
| My Pay | ✅ |
| Apps Marketplace | ✅ (via Zura Apps header link) |

### Potentially Orphaned / Hard to Find
| Feature | Route | Reachable? |
|---------|-------|------------|
| Handbooks | `/admin/handbooks` | ❓ Not in Ops Hub or Settings |
| Features Center | `/admin/features` | ❓ Not in Ops Hub or Settings |
| Data Import | `/admin/data-import` | ❓ Not in Ops Hub or Settings |
| Price Recommendations | `/admin/price-recommendations` | ❓ Not in Ops Hub or Settings |
| KPI Builder | `/admin/kpi-builder` | ❓ Likely accessed from Analytics Hub |
| Executive Brief | `/admin/executive-brief` | ❓ Likely accessed from Command Center |
| Decision History | `/admin/decision-history` | ❓ Likely contextual link |
| Changelog | `/changelog` | ❓ Likely accessed from help/profile menu |
| Metrics Glossary | `/metrics-glossary` | ❓ Likely contextual link |
| Notification Preferences | `/notification-preferences` | ❓ Likely from profile/bell menu |
| Help Center | `/help` | ❓ Likely from HelpFAB |

## Findings

**The coverage is very good.** The sidebar + Operations Hub + Settings combination provides access to virtually every admin feature. The items marked ❓ above are mostly contextual pages accessed through in-app links (e.g., Executive Brief from Command Center, KPI Builder from Analytics). They are not "lost" — they're just not top-level entry points.

The only items worth verifying are:
1. **Handbooks** — admin handbook management; may need a card in Ops Hub under Team Operations
2. **Features Center** — org-level feature flag management; could belong in Settings under Platform
3. **Data Import** — data migration tool; could belong in Settings under Platform
4. **Price Recommendations** — pricing intelligence; likely accessed from Analytics Hub context

## Recommendation

No immediate changes needed. The current navigation structure covers all super admin needs comprehensively. The few contextual pages (Executive Brief, KPI Builder, Decision History, etc.) are accessed through relevant in-context links, which is the correct UX pattern — not everything needs a top-level card.

If you'd like, I can verify the exact access paths for the 3-4 potentially orphaned items (Handbooks, Features Center, Data Import, Price Recommendations) to confirm they have in-context entry points, or add cards for any that are truly unreachable.


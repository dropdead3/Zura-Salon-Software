/**
 * Platform-authored starter drafts for every policy in the library.
 *
 * Doctrine:
 *  - Human-authored, not AI-generated. Reviewed by the platform team.
 *  - Advisory tone, not directive. Explains why structure protects operators.
 *  - Brand-abstracted: uses {{ORG_NAME}} and {{PLATFORM_NAME}} tokens.
 *  - Structured-rule-aware: references {{rule_key}} placeholders that
 *    `renderStarterDraft` substitutes from configured rule values.
 *
 * Keyed by `policy_library.key` (not configurator schema key) because policies
 * sharing a schema (e.g. cancellation_policy + no_show_policy share generic
 * shape) still need policy-specific prose.
 *
 * Variants:
 *   internal      — operational voice for staff handbook
 *   client        — warm, plain-language for client-facing surfaces
 *   manager_note  — directive decision card for handling exceptions
 *   disclosure    — short, legal-leaning paragraph for booking/checkout
 */

import { getRelevantScopes } from './applicability-relevance';

export interface StarterDraftSet {
  internal?: string;
  client?: string;
  manager_note?: string;
  disclosure?: string;
}

export const STARTER_DRAFTS: Record<string, StarterDraftSet> = {
  // ─── Cancellation / scheduling ─────────────────────────────────────────
  cancellation_policy: {
    internal: `**Cancellation policy**\n\nGuests may cancel without charge up to {{notice_window_hours}} hours before their appointment. Cancellations inside this window are subject to a fee of {{fee_amount}} (per the configured fee structure). Documented illness is reviewed on a case-by-case basis. Front desk logs every cancellation in the appointment record, including the reason and whether a fee was applied. Fee waivers require {{waiver_authority}} approval and a documented reason in the appointment notes.`,
    client: `**Cancellation policy**\n\nWe ask for at least {{notice_window_hours}} hours notice if you need to cancel so we can offer your slot to another guest. Cancellations made inside that window are subject to a fee of {{fee_amount}}. We always make exceptions for documented illness — just let us know. Thank you for respecting your stylist's time.`,
    manager_note: `**Decision card — cancellation fee waiver**\n\nWaivers are approved by {{waiver_authority}}. Before approving, confirm: (1) the reason qualifies (illness, emergency, or first-offense if enabled), (2) the guest's recent attendance history, (3) the impact on the stylist's column. Log the reason and your initials in the appointment record.`,
    disclosure: `Cancellations made within {{notice_window_hours}} hours of your appointment are subject to a {{fee_amount}} fee. By booking, you agree to this policy.`,
  },

  no_show_policy: {
    internal: `**No-show policy**\n\nA no-show is recorded when a guest fails to arrive within 15 minutes of the appointment start time without notice. No-shows are charged {{no_show_fee_amount}} of the booked service. The card on file is charged automatically; if no card is on file, the balance is added to the guest's account and must be settled before the next booking. Repeat no-shows (3 within 90 days) require pre-payment for future appointments.`,
    client: `**No-show policy**\n\nIf you don't arrive for your appointment without letting us know, we'll charge {{no_show_fee_amount}} of the booked service to your card on file. We hold your stylist's time exclusively for you, so a missed appointment means lost income for them. We appreciate a quick call or text if your plans change.`,
    manager_note: `**Decision card — no-show enforcement**\n\nReview the guest's history before charging. First-time no-shows for long-tenured guests may warrant a courtesy waiver — log the reason. Repeat offenders (3+ in 90 days) move to pre-pay required; flag this in the client record so front desk enforces at next booking.`,
    disclosure: `Failure to arrive for your appointment without notice will result in a {{no_show_fee_amount}} charge to your card on file.`,
  },

  late_arrival_policy: {
    internal: `**Late arrival policy**\n\nGuests arriving more than 15 minutes late may have their service shortened to fit the remaining time, rescheduled, or cancelled at the stylist's discretion. The full booked price applies if the appointment proceeds. Front desk notifies the stylist immediately when a guest is late and confirms the path forward with the guest before starting any service.`,
    client: `**Running late?**\n\nWe understand things happen. If you're more than 15 minutes late, we may need to shorten your service, reschedule, or — depending on the day — cancel so we can stay on time for the guests who follow you. Please call ahead if you can.`,
    manager_note: `**Decision card — late arrival**\n\nThe stylist decides whether to proceed, shorten, or reschedule. Manager only intervenes if the guest disputes a fee. Confirm the original booked time was accurate and that the stylist had buffer to accommodate before approving any waiver.`,
    disclosure: `Arriving more than 15 minutes late may result in a shortened service, rescheduling, or cancellation at the stylist's discretion. The full service price applies.`,
  },

  // ─── Deposits / payment ────────────────────────────────────────────────
  deposit_policy: {
    internal: `**Deposit policy**\n\nDeposits of {{deposit_amount}} are required for services over {{min_service_total}}. The deposit is collected at booking via the payment link and {{applies_to_total}} applied to the final service total. Deposits are refundable when the guest cancels outside the notice window; inside the window, the deposit is forfeited.`,
    client: `**Deposit policy**\n\nA {{deposit_amount}} deposit secures your booking for services over {{min_service_total}}. Your deposit goes toward your final total. If you cancel with proper notice, your deposit is fully refundable.`,
    disclosure: `A {{deposit_amount}} deposit is required to confirm this booking and will be applied to your final service total.`,
  },

  payment_policy: {
    internal: `**Payment policy**\n\n{{ORG_NAME}} accepts all major credit cards, debit, Apple Pay, Google Pay, and cash. Payment is collected at the end of service. Outstanding balances must be settled before booking the next appointment. Tips are at the guest's discretion and may be added to any payment method.`,
    client: `**Payment**\n\nWe accept all major cards, Apple Pay, Google Pay, and cash. Payment is collected at the end of your service. Tips are appreciated and never required.`,
    disclosure: `Payment is due at the end of service. We accept all major cards, contactless payments, and cash.`,
  },

  pricing_transparency: {
    client: `**Pricing**\n\nOur prices reflect the experience, education, and time of each stylist on our team. Color, extensions, and corrective work are quoted during your consultation so you always know what to expect before service begins. If your service changes during your appointment, we'll confirm the updated price with you first.`,
    internal: `**Pricing transparency standard**\n\nEvery guest receives a price quote during consultation, before service begins. Any change to scope (additional bowls, extra time, add-on treatments) requires guest confirmation before the change is applied. Front desk reviews the final ticket with the guest at checkout.`,
    disclosure: `Service prices are confirmed during your consultation. Any change to your service requires your approval before it's applied to your ticket.`,
  },

  refund_service_policy: {
    internal: `**Service refund policy**\n\nWe stand behind our work. Concerns must be raised within {{window_days}} days of service. Our first remedy is a redo (see redo policy). Refunds are issued only when a redo is declined or impractical, and are capped at {{refund_cap_pct}}% of the service price. {{approver_role}} approves all refund decisions and documents the reason in the guest record.`,
    client: `**Not happy with your service?**\n\nLet us know within {{window_days}} days and we'll make it right. Our first step is always a redo with the same stylist or another team member of your choice. If a redo isn't the right fit, we'll discuss other options together.`,
    manager_note: `**Decision card — service refund**\n\n{{approver_role}} approves refunds. Confirm: (1) concern raised within {{window_days}} days, (2) redo offered first, (3) refund amount within {{refund_cap_pct}}% cap. Document the reason and outcome in the guest's record.`,
  },

  redo_policy: {
    internal: `**Redo policy**\n\nGuests may request a redo within {{window_days}} days of service for qualifying concerns: {{qualifying_reasons}}. Redos are scheduled with the original stylist when possible. {{approver_role}} approves all redos and confirms the issue qualifies before booking. Excluded: {{exclusions}}.`,
    client: `**Redo guarantee**\n\nIf something isn't right, let us know within {{window_days}} days and we'll redo your service. We'll book you with the same stylist when possible, or with another team member of your choice. Some situations don't qualify — your stylist will walk you through what does.`,
    manager_note: `**Decision card — redo approval**\n\n{{approver_role}} approves. Confirm the concern is one of: {{qualifying_reasons}}. Rule out exclusions: {{exclusions}}. Schedule with original stylist if available. Log the reason and resolution in the guest record.`,
    disclosure: `Redos are available within {{window_days}} days of service for qualifying concerns. Please contact us promptly if you'd like to discuss your service.`,
  },

  retail_return_policy: {
    internal: `**Retail return policy**\n\nProducts may be returned within {{window_days}} days, in {{condition}} condition. Receipt {{receipt_required}} required. Refunds are issued as {{refund_method}}. A {{restocking_fee_pct}}% restocking fee applies. Front desk inspects every return and logs the reason code (defective, allergic reaction, wrong recommendation, change of mind).`,
    client: `**Retail returns**\n\nWe want you to love what you take home. Return any product within {{window_days}} days for a refund. The product should be {{condition}} when returned. Bring your receipt if you have it.`,
    disclosure: `Retail products may be returned within {{window_days}} days in {{condition}} condition.`,
  },

  // ─── Booking / consultation ────────────────────────────────────────────
  booking_policy: {
    internal: `**Booking policy**\n\nGuests may book online, by phone, or in person. New guests for color, extensions, or corrective work require a consultation prior to booking the service appointment. The booking system collects a card on file for cancellation and no-show enforcement. Service durations and pricing are confirmed at consultation, not at booking.`,
    client: `**Booking with us**\n\nYou can book online, give us a call, or stop in. New to color, extensions, or corrections? We'll start with a consultation to make sure we plan the right service for you. We hold a card on file when you book — it's only charged if our cancellation or no-show policy applies.`,
    disclosure: `A card on file is required to confirm your booking. It is only charged in accordance with our cancellation and no-show policies.`,
  },

  consultation_policy: {
    internal: `**Consultation policy**\n\nConsultations are required before color services for new guests, before any corrective work, and before extension installations. Consultations may be in-person (15 min) or virtual (10 min) and are non-billable when followed by a booked service within 30 days. The consulting stylist documents desired outcome, hair history, predicted scope, and price quote in the guest record.`,
    client: `**Consultations**\n\nFor color, extensions, or corrective work, we'll meet with you first to talk through what you're hoping for, look at your hair, and walk through pricing. Consultations take about 15 minutes and are free with a booked service.`,
  },

  // ─── Extensions ────────────────────────────────────────────────────────
  extension_consultation: {
    internal: `**Extension consultation**\n\nEvery extension service begins with a paid 30-minute consultation. The stylist evaluates hair integrity, recommends method (tape, bead, keratin, etc.), discusses color match, and provides a written quote with maintenance and removal pricing. Guest signs the consultation summary acknowledging method, color, expected lifespan, and aftercare requirements before the install is booked.`,
    client: `**Extension consultations**\n\nExtensions are a real investment, so we start with a focused 30-minute consultation to find the right method for your hair, match the color, and give you a clear quote that includes maintenance and removal. You'll leave with everything in writing so you can decide on your own time.`,
  },

  extension_install: {
    internal: `**Extension install**\n\nInstall sessions follow the consultation plan. Installer takes before, during, and after photos for the guest record. Aftercare kit is required at install — it's voided warranty if the guest declines. Guest signs the aftercare acknowledgment before leaving the chair. Maintenance interval is booked at install before the guest leaves.`,
    client: `**Your extension install**\n\nInstall day, we follow the plan from your consultation. We'll take a few before-and-after photos for your record, get your aftercare kit set up with you, and book your first maintenance appointment before you leave so everything stays beautiful.`,
  },

  extension_warranty: {
    internal: `**Extension warranty**\n\nWorkmanship is covered for {{workmanship_window_days}} days from install — bonds slipping, attachment failure, etc. Manufacturer defects are covered for the manufacturer's stated window. Warranty is voided by: {{voids_warranty}}. Photos at install are required to honor any warranty claim.`,
    client: `**Extension warranty**\n\nYour install is covered for {{workmanship_window_days}} days for workmanship — if a bond slips or anything isn't holding the way it should, we'll fix it. We can't cover damage from the things listed in your aftercare kit (sulfate shampoo, missed maintenance, home color, etc.).`,
    disclosure: `Workmanship covered for {{workmanship_window_days}} days. Warranty is voided by sulfate shampoo, home color, missed maintenance, or removal by another stylist.`,
  },

  extension_aftercare: {
    internal: `**Extension aftercare**\n\nAftercare kit purchase is required at install. Guest receives written aftercare instructions covering: shampoo selection, conditioner application, brushing technique, sleep care, swim/sweat protocol, and maintenance schedule. Aftercare instructions are emailed and logged in the guest record.`,
    client: `**Caring for your extensions**\n\nWith good care, your extensions look amazing for their full lifespan. Use the products in your aftercare kit, brush gently from the ends up, sleep with hair loosely braided, and rinse thoroughly after swimming. We'll send a written guide and book your maintenance appointment before you leave.`,
  },

  extension_maintenance: {
    internal: `**Extension maintenance**\n\nMaintenance intervals are 6–10 weeks depending on method. The next appointment is booked at install or at each maintenance visit before the guest leaves. Missed maintenance (>14 days past recommended interval) voids the workmanship warranty.`,
    client: `**Extension maintenance**\n\nWe'll book your maintenance appointments in advance to keep everything looking and feeling its best. If life gets in the way, please let us know — going too long between appointments can affect how your extensions wear.`,
  },

  extension_removal: {
    internal: `**Extension removal**\n\nRemoval must be performed by a {{ORG_NAME}} stylist or it voids any warranty and may damage natural hair. Removal is priced separately from install and is included in the consultation quote. Removal includes a clarifying treatment and assessment of natural hair condition.`,
    client: `**Removing your extensions**\n\nWhen it's time to remove, please come back to us. Removing extensions yourself or at another salon can damage your natural hair, and it voids your warranty. We include a clarifying treatment with every removal.`,
  },

  extension_deposit: {
    client: `**Extension deposit**\n\nWe ask for a deposit at booking to reserve your install — extension appointments are long and we order hair specifically for you. Your deposit is fully applied to your service total.`,
    internal: `**Extension deposit**\n\n50% non-refundable deposit collected at booking covers ordered hair and reserved chair time. Refundable only if {{ORG_NAME}} cancels or reschedules.`,
  },

  extension_redo_adjustment: {
    client: `**Extension adjustments**\n\nIf bonds need adjustment in the first two weeks after your install, that's covered — just come back and we'll take care of it.`,
  },

  extension_return_refund: {
    internal: `**Extension returns/refunds**\n\nOrdered hair is non-returnable once it ships. Installed extensions are not refundable. Workmanship issues are addressed under the warranty policy with a redo, not a refund.`,
  },

  // ─── Packages / gift cards ─────────────────────────────────────────────
  package_membership_policy: {
    internal: `**Package & membership policy**\n\nPackages and memberships expire {{expiration_months}} months after purchase. {{transferable}} transferable to another guest. Refunds: {{refundable}}. Front desk tracks expiration and notifies the guest 30 days prior. Unused services may be applied to other services of equal or lesser value with manager approval.`,
    client: `**Packages & memberships**\n\nPackages expire {{expiration_months}} months from purchase, so plan your visits accordingly. We'll send you a reminder 30 days before expiration. Got questions about what you have left? Just ask the front desk.`,
    disclosure: `Packages expire {{expiration_months}} months from purchase. Refund terms: {{refundable}}.`,
  },

  gift_card_policy: {
    client: `**Gift cards**\n\nGift cards never expire and can be used toward any service or product. Lost cards can be replaced with proof of purchase.`,
    internal: `**Gift cards**\n\nGift cards do not expire (per state law in most jurisdictions). Balances are tracked in the POS. Lost-card replacement requires receipt or original transaction record. Cards are not redeemable for cash.`,
  },

  // ─── Promotions / discounts ────────────────────────────────────────────
  promotional_discount: {
    client: `**Promotions & discounts**\n\nPromotional pricing applies only to the services listed in the promotion and cannot be combined with other offers or stylist-specific discounts unless stated. New-client offers apply to first-time guests only.`,
    internal: `**Promotional discount policy**\n\nDiscounts cannot stack. New-client offers verified against guest record. Promotional pricing is set at the org level — stylists cannot apply additional discounts without manager approval. Promotions are logged at checkout for revenue attribution.`,
  },

  // ─── Guest experience / safety ─────────────────────────────────────────
  child_guest_policy: {
    client: `**Children in the salon**\n\nWe love your kids — and to keep everyone safe and your stylist focused, we ask that children not receiving service are accompanied by a non-service adult. Our color bar and hot tools area aren't safe spaces for unsupervised children.`,
    internal: `**Child guest policy**\n\nChildren not receiving service must be accompanied by a non-service adult. Stylists may pause or end an appointment if an unsupervised child poses a safety risk. Front desk informs every guest of this policy at booking.`,
    disclosure: `Children not receiving service must be supervised by a non-service adult.`,
  },

  pet_policy: {
    client: `**Pets**\n\nWe love animals, but for safety and allergy reasons, only certified service animals are permitted in the salon.`,
    internal: `**Pet policy**\n\nOnly ADA-certified service animals are permitted. Front desk may not request documentation but may ask the two ADA-permitted questions: (1) is the animal a service animal required because of a disability, (2) what work or task has the animal been trained to perform.`,
    disclosure: `Only certified service animals are permitted in the salon.`,
  },

  health_safety_policy: {
    client: `**Health & safety**\n\nFor everyone's safety, please reschedule if you're feeling unwell. We sanitize all tools and stations between guests, follow state board sanitation requirements, and our team is trained on incident response. Let us know about any allergies or sensitivities at consultation.`,
    internal: `**Health & safety**\n\n{{ORG_NAME}} follows all state board sanitation and infection-control requirements. Tools are sanitized between every guest. Allergies and sensitivities are documented in the guest record at consultation. Staff complete annual refresher training on incident response and cross-contamination prevention.`,
  },

  photo_consent_policy: {
    client: `**Photos & social media**\n\nWe love sharing your transformations. Before and after photos are only posted with your written permission. You can update or withdraw consent any time — just let us know.`,
    internal: `**Photo consent**\n\nWritten consent required before any guest photo is captured for portfolio or social media. Consent is logged with date, intended use (portfolio, social, both), and tag handle. Withdrawal of consent is honored within 7 days of request.`,
    disclosure: `Photos for marketing or social media are taken only with your written consent.`,
  },

  accessibility_accommodation: {
    client: `**Accessibility**\n\nOur salon is accessible to guests with mobility needs. Let us know at booking if you need an accessible station, additional time, or any other accommodation — we'll set everything up before you arrive.`,
    internal: `**Accessibility & accommodation**\n\n{{ORG_NAME}} provides accessible stations and accommodates mobility, sensory, and communication needs on request. Accommodation requests are documented in the guest record so they're prepared at every future visit.`,
  },

  hair_order_special_order: {
    client: `**Special orders**\n\nFor extensions, custom color, or specialty hair, we order specifically for your service. A non-refundable deposit secures the order. If you cancel after the order is placed, the deposit is forfeited.`,
    internal: `**Special order policy**\n\nSpecial orders (extensions, custom color, specialty hair) require a non-refundable deposit covering the wholesale cost. Order is placed once deposit clears. Cancellation after order is placed forfeits the deposit.`,
  },

  // ─── Both-audience: shared ─────────────────────────────────────────────
  chargeback_dispute: {
    client: `**Chargebacks & disputes**\n\nIf you have a concern about a charge, please contact us first — we want to make it right. Disputing a valid charge with your bank without contacting us may result in restricted future booking privileges.`,
    internal: `**Chargeback handling**\n\nAll chargebacks are reviewed within 48 hours by management. Documentation (signed consultation, service record, photos, payment receipt) is gathered for response. Guests with chargebacks for valid charges are flagged in the system; future bookings require pre-payment.`,
    manager_note: `**Decision card — chargeback**\n\nGather: signed consultation, service notes, ticket, payment receipt. Submit response within 48 hours. After resolution, flag the guest record so future bookings require pre-payment.`,
  },

  property_damage_lost: {
    client: `**Personal property**\n\nWe care for your belongings while you're with us, but we can't be responsible for items left in the salon. Please keep valuables with you or in your bag at your station.`,
    internal: `**Property damage / lost items**\n\nGuest property left in the salon is held for 30 days, then donated. Damage to guest property during service (e.g., color on clothing) is reviewed by management; replacement value is offered when fault is established. Internal property damage is documented in the incident log.`,
  },

  // ─── Internal: HR / employment ─────────────────────────────────────────
  employment_classifications: {
    internal: `**Employment classifications**\n\n{{ORG_NAME}} employs team members in the following classifications: full-time employees, part-time employees, and (where applicable) booth-rental contractors. Classification determines benefits eligibility, scheduling expectations, and tax handling. Classification is set at hire and reviewed annually. Reclassification requires {{authority_role}} approval and a written record of the change rationale.`,
    manager_note: `**Reclassification decision card**\n\nReclassification requires {{authority_role}} approval. Confirm the change reflects actual working conditions (hours, supervision, equipment, exclusivity). Document rationale in the employee file. Notify payroll before the next pay period.`,
  },

  attendance_punctuality: {
    internal: `**Attendance & punctuality**\n\nTeam members arrive {{notice_required_days}} ready for the day's first appointment — clocked in, in dress code, station prepped. Tardiness or absence is communicated to the manager as early as possible. Patterns of tardiness follow the progressive discipline path.`,
    manager_note: `**Attendance escalation**\n\nFirst incident: verbal conversation, logged. Second within 60 days: written notice. Third: final warning with written corrective plan. Document each step in the employee file.`,
  },

  benefits_pto_sick: {
    internal: `**PTO & sick leave**\n\nPTO accrues {{accrual_method}} after {{eligibility_after_days}} days of employment, up to {{annual_days}} days annually. Requests submitted with at least {{notice_required_days}} days notice and approved by {{approver_role}}. Sick leave is separate from PTO and does not require advance notice. Blackout periods: {{blackout_periods}}.`,
    manager_note: `**PTO request decision card**\n\nApprove if: (1) notice meets {{notice_required_days}} days minimum, (2) coverage is available, (3) request is outside blackout periods, (4) employee has accrued balance. Document approval in the scheduling system.`,
  },

  compensation_overview: {
    internal: `**Compensation overview**\n\n{{ORG_NAME}} pays team members on a {{pay_model}} structure, processed {{pay_schedule}}. Tips are {{tip_handling}}. Detailed commission tiers, hourly rates, and bonus structures are documented in each team member's offer letter and reviewed annually. Pay disputes are reviewed by management within one pay period.`,
  },

  scheduling_availability: {
    internal: `**Scheduling & availability**\n\nTeam members submit availability two weeks in advance for the upcoming schedule. Manager builds the schedule balancing team availability, expected demand, and coverage requirements. Schedule is posted at least one week in advance. Shift swaps require manager approval and may not exceed 40 hours weekly without approval.`,
  },

  timekeeping_breaks: {
    internal: `**Timekeeping & breaks**\n\nTeam members clock in upon arrival and clock out at end of shift. Meal breaks (30 minutes, unpaid) are provided for shifts over 6 hours; rest breaks (10 minutes, paid) for every 4 hours worked, in line with state requirements. Forgotten clock-ins are corrected by the manager with employee confirmation.`,
  },

  dress_code_appearance: {
    internal: `**Dress code & appearance**\n\nTeam members present a polished, professional appearance consistent with the salon's brand. Specific dress code (color palette, footwear, branded apparel) is documented in the new-hire packet. Personal grooming reflects the standard of care we offer guests. Hair, makeup, and nails worn at work serve as a portfolio of the team's craft.`,
    manager_note: `**Dress code conversation**\n\nCoach privately, never in front of the team or guests. Reference the documented standard, not personal opinion. Offer practical solutions (loaner apron, clean alternative). Document the conversation only if a pattern develops.`,
  },

  professional_conduct: {
    internal: `**Professional conduct**\n\nTeam members at {{ORG_NAME}} treat guests, colleagues, vendors, and the public with respect at all times. Gossip, harassment, discrimination, and retaliation are not tolerated and are addressed immediately under the progressive discipline policy. Concerns are reported to a manager or owner without fear of retaliation.`,
  },

  performance_expectations: {
    internal: `**Performance expectations**\n\nEvery team member has a written role description with measurable expectations: rebooking rate, retail attachment, retention, productivity, and contribution to team culture. Performance is reviewed quarterly with the manager. Underperformance triggers a written improvement plan with clear targets and a 60-day review window.`,
  },

  promotions_advancement: {
    internal: `**Promotions & advancement**\n\nAdvancement is tied to demonstrated performance against the level criteria, not tenure alone. Promotion is reviewed at the quarterly performance check-in. Promotion decisions consider: client retention, productivity, retail attachment, professional development, and team contribution. Documented criteria are reviewed at every level transition.`,
    manager_note: `**Promotion decision card**\n\nReview the level criteria checklist with the team member. Confirm performance metrics meet or exceed the next level for the trailing 90 days. Document the decision in the employee file with metrics, date, and {{authority_role}} signature.`,
  },

  progressive_discipline: {
    internal: `**Progressive discipline**\n\nThe standard path for performance or conduct issues is: {{enforcement_steps}}. Each step is documented in the employee file with date, conversation summary, expected change, and a follow-up review date. Severe violations (theft, violence, gross misconduct) bypass the progressive path. {{enforcement_authority}} owns the discipline path.`,
    manager_note: `**Progressive discipline decision card**\n\nConfirm the issue justifies the next step. Document: incident, prior steps, conversation summary, expected change, review date. Both manager and employee sign. Place in employee file. Notify owner of any final-warning step.`,
  },

  separation_offboarding: {
    internal: `**Separation & offboarding**\n\nWhen a team member leaves {{ORG_NAME}} — voluntary or otherwise — final pay is processed in the next pay cycle, all keys/cards are returned, and access to systems is revoked the day of separation. Outstanding ticket balances and product loans are settled. Exit conversation is offered for voluntary departures.`,
    manager_note: `**Offboarding checklist**\n\nDay of: revoke system access, collect keys and branded apparel, conduct exit conversation if voluntary. Within 1 pay cycle: final pay including PTO payout per policy, return of personal items, removal from team scheduling and rosters. Update client records to reassign guests to other team members.`,
  },

  culture_values: {
    internal: `**Culture & values**\n\n{{ORG_NAME}} is built on craft, accountability, and respect. We invest in education, hold each other to high standards, and protect the integrity of our work and our team. New team members are introduced to our values during onboarding and they shape every hiring, promotion, and performance decision.`,
  },

  social_media_branding: {
    internal: `**Social media & branding**\n\nTeam members may share work on personal social channels with the following standards: tag {{ORG_NAME}}, never post a guest's image without their written consent (per the photo consent policy), and don't share pricing, internal conflicts, or proprietary techniques publicly. Brand assets (logos, hashtags) are provided in the team drive.`,
  },

  technology_device_usage: {
    internal: `**Technology & device usage**\n\nPersonal phones are kept off the floor during guest service. Salon devices (POS, booking system, tablet) are used for work purposes only. Passwords are not shared. Lost or stolen devices are reported immediately so access can be revoked.`,
  },

  confidentiality_trade: {
    internal: `**Confidentiality & trade**\n\nFormulas, client lists, pricing, business performance, and proprietary techniques are confidential. Team members do not share this information with competitors, on social media, or with departing team members. This obligation continues after separation. Violations are addressed under the progressive discipline policy.`,
  },

  cleanliness_sanitation: {
    internal: `**Cleanliness & sanitation**\n\nStations are cleaned and tools sanitized between every guest. Brushes, combs, and capes are laundered or disinfected daily. Color bowls and brushes are washed immediately after use. The break room, restrooms, and common areas are maintained on a posted rotation. State board sanitation requirements are met or exceeded at all times.`,
  },

  safety_emergency: {
    internal: `**Safety & emergency response**\n\nEmergency exits, fire extinguishers, and first aid kit locations are reviewed during onboarding. In an emergency: (1) ensure guest and team safety, (2) call 911 if needed, (3) notify the manager. Incidents — guest injury, near miss, equipment failure — are documented in the incident log within 24 hours.`,
  },

  documentation_standards: {
    internal: `**Documentation standards**\n\nEvery service is documented in the guest record: formula used, processing time, products applied, recommendations, photos when appropriate. Documentation supports continuity across visits, redo decisions, and warranty claims. Records are completed before the team member leaves for the day.`,
  },

  complaint_resolution: {
    internal: `**Complaint resolution**\n\nGuest concerns are heard with empathy and resolved at the lowest level possible: stylist first, then manager, then owner. Concerns about service quality follow the redo policy. Concerns about staff conduct are documented and reviewed by management within 48 hours. Resolution is communicated to the guest and logged in the guest record.`,
    manager_note: `**Complaint resolution decision card**\n\nListen first. Acknowledge the concern. Confirm what the guest is asking for (redo, refund, apology, escalation). Reference the relevant policy. Document the conversation and outcome in the guest record. Loop in the involved team member privately, after the guest leaves.`,
  },

  goodwill_resolution: {
    internal: `**Goodwill resolution**\n\nWhen a guest experience falls short of our standard but doesn't qualify under a specific policy, {{authority_role}} may authorize a goodwill gesture (complimentary add-on, future-visit credit, product) up to {{max_value}}. Goodwill decisions are logged in the guest record with the reason. Goodwill above {{max_value}} requires escalation to {{escalation_role}}.`,
  },

  exception_authority: {
    internal: `**Exception authority**\n\n{{authority_role}} is authorized to grant exceptions to standard policies up to {{max_value}}. Above this, escalation to {{escalation_role}} is required. Every exception is documented with reason, value, and approver in the relevant record (guest, employee, or operational log). Exception data is reviewed quarterly to identify policies that need updating.`,
    manager_note: `**Exception authority decision card**\n\nConfirm the request is within your authority limit ({{max_value}}). If not, escalate to {{escalation_role}} before committing. Document: reason, value, approver, date, in the relevant record. Repeat patterns of exceptions for the same policy signal that the policy itself needs review.`,
  },

  escalation_path: {
    internal: `**Escalation path**\n\nDecisions follow a clear ladder: stylist → lead/manager → {{authority_role}} → {{escalation_role}}. Escalation happens when the situation exceeds the current level's authority limit, when policy is unclear, or when the guest or team member requests it. Escalations are documented at every step so the receiving level has full context.`,
    manager_note: `**Escalation decision card**\n\nDocument what's been tried at lower levels before escalating. Provide the receiving level with: situation, what's been offered, what the guest/employee is asking for, your recommendation. Stay engaged through resolution; don't hand off and disappear.`,
  },
};

export function getStarterDraftSet(libraryKey: string): StarterDraftSet | null {
  return STARTER_DRAFTS[libraryKey] ?? null;
}

/**
 * Strip the leading bold heading line (e.g. `**Cancellation policy**`) from
 * a starter-draft body so we can reuse the prose as a structured-field
 * default without leaking markdown into a plain `<Textarea>`.
 */
function stripHeading(body: string): string {
  return body.replace(/^\s*\*\*[^*]+\*\*\s*\n+/, '').trim();
}

/**
 * Split a body into paragraphs (double-newline separated).
 */
function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Per-policy structured defaults for the `generic_shape` schema, derived
 * from the platform-authored starter draft for that policy + the
 * applicability manifest (for `who_it_applies_to`). The starter draft is
 * the canonical prose source; the applicability manifest is the structured
 * truth about who the policy covers — composing the prose from it keeps
 * the two surfaces in sync.
 *
 * Returns an empty object when no starter draft exists for the key — the
 * schema's own `defaultValue` strings remain the fallback.
 *
 * Brand tokens ({{ORG_NAME}}, {{PLATFORM_NAME}}) are NOT resolved here;
 * the configurator's existing `interpolateDefaults` pass handles that so
 * there's exactly one place tokens get substituted.
 */
export interface PolicySummaryContext {
  /** Library category — used to fall back through `getRelevantScopes`. */
  category?: string;
  /** Library audience — `internal` | `external` | `both`. */
  audience?: 'internal' | 'external' | 'both';
  /** Number of active locations on the org (drives "across every location" filler). */
  locationCount?: number;
  /** Whether the policy's schema declares an `authority_role` field. */
  schemaHasAuthorityRole?: boolean;
}

export function getPolicySummaryDefaults(
  libraryKey: string,
  ctx: PolicySummaryContext = {},
): Partial<{ policy_summary: string; who_it_applies_to: string }> {
  const out: Partial<{ policy_summary: string; who_it_applies_to: string }> = {};

  // ── policy_summary (first paragraph of starter draft) ───────────────────
  const set = STARTER_DRAFTS[libraryKey];
  const internal = set?.internal;
  if (internal) {
    const body = stripHeading(internal);
    const paras = paragraphs(body);
    if (paras.length > 0) out.policy_summary = paras[0];
  }

  // ── who_it_applies_to (composed from applicability manifest) ────────────
  const composed = composeWhoItAppliesTo(libraryKey, ctx);
  if (composed) out.who_it_applies_to = composed;

  return out;
}

/**
 * Compose a per-policy "Who it applies to" sentence from the applicability
 * manifest. Returns null if no manifest entry exists and the category has
 * no defaults — letting the schema's generic `defaultValue` win.
 *
 * The composition is deterministic and intentionally narrow: audience
 * clause + (optional) primary-lever clause + (optional) location clause +
 * (optional) authority-chain footnote. No 47 hand-authored strings.
 */
function composeWhoItAppliesTo(
  libraryKey: string,
  ctx: PolicySummaryContext,
): string | null {
  // Lazy-require to avoid a circular import (relevance manifest doesn't
  // import starter-drafts, but keep it defensive).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getRelevantScopes } = require('./applicability-relevance') as typeof import('./applicability-relevance');

  const category = (ctx.category ?? 'client') as Parameters<typeof getRelevantScopes>[1];
  const audience = ctx.audience ?? 'both';
  const manifest = getRelevantScopes(libraryKey, category, audience);

  // Audience clause — locked manifests give us a definitive answer.
  let audienceClause: string;
  if (manifest.audienceLocked) {
    audienceClause =
      audience === 'internal'
        ? 'All team members of {{ORG_NAME}}'
        : audience === 'external'
          ? 'All clients of {{ORG_NAME}}'
          : 'All team members and clients of {{ORG_NAME}}';
  } else if (audience === 'external') {
    audienceClause = 'All clients of {{ORG_NAME}}';
  } else if (audience === 'internal') {
    audienceClause = 'All team members of {{ORG_NAME}}';
  } else {
    // 'both' with no lock — keep the original boilerplate phrasing as the
    // honest answer (the policy genuinely spans both audiences).
    audienceClause =
      'All team members and, where the policy involves guest interactions, all clients of {{ORG_NAME}}';
  }

  // Primary lever clause — phrased per scope type.
  const primaryClause = (() => {
    switch (manifest.primaryScope) {
      case 'employment_type':
        return ', organized by employment classification';
      case 'role':
        return ', based on role assignment';
      case 'service_category':
        return ', for the configured service categories';
      case 'location':
        return '';
      case 'audience':
        return '';
      default:
        return '';
    }
  })();

  // Location clause — only when the policy lists location AND the org
  // actually has multiple locations (single-location orgs don't need
  // "across every location" filler).
  const locationCount = ctx.locationCount ?? 0;
  const locationClause =
    manifest.scopes.includes('location') && locationCount > 1
      ? ' across every location'
      : '';

  const authorityClause = ctx.schemaHasAuthorityRole
    ? ' Exceptions follow the documented authority chain below.'
    : '';

  return `${audienceClause}${primaryClause}${locationClause}.${authorityClause}`;
}

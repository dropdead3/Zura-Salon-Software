

## Staff Mapping: Complete Picture and Next Steps

### What We Found

The Phorest API returned **27 unmapped staff members** with full names and emails. Here they are, grouped by what we can do with them:

### Group A: Can Auto-Map Now (match by email/name to existing Zura profiles)

| Phorest Name | Phorest ID | Zura Match | Confidence |
|---|---|---|---|
| Kristi Day | `G-2ZTL3-nlcvpNsdGySVUQ` (North Mesa) | No email match, but she's the owner | Needs your confirmation |
| Kristi Day | `vbgizbOuPwmEO0VCWxjHeA` (Val Vista) | Same person, second branch | Needs your confirmation |

Kristi Day has two Phorest staff IDs (one per branch) but no Zura employee profile yet. Alex Day (`alexmaxday@gmail.com`) is in Zura but doesn't appear in the Phorest staff list.

### Group B: 25 Staff Without Zura Accounts

These are real stylists/staff in Phorest who need employee profiles created in Zura before they can be mapped:

| Name | Email | Phorest ID(s) | Appointment Count |
|---|---|---|---|
| Rubie Guerrero | alteredhueaz@gmail.com | `OrwoPcDijr4EtrCC87TIWw` | 61 |
| Jamie Vieira | Jamiebaird00@gmail.com | `MtsEB9DLwhqoZkHtbokQVg`, `eaPLYyNzfGKTAhS36xvdFQ` | 50+ |
| Gavin Eagan | gavin.eagan1@gmail.com | `CEJCM1rVldGkgzfWb6ytlQ` | 46 |
| Cienna Ruthem | Ruthemcienna@gmail.com | `sc-q41_Z0hYTwPCIe7Gqew` | 46 |
| Chelsea Wright | chelseajwright21@gmail.com | `zV5m_FyFDmbgoXHG8Mqw9A` | ~40 |
| Hayleigh Hoy | hayleighhhair@gmail.com | `MwO7nCebhjUTLQAZz3zm6Q` | ~35 |
| Trinity Graves | cottamsrose@gmail.com | `rsGkXObj0hZnjy3oD3oBBQ` | ~30 |
| Alexis Heasley | lexhea2@gmail.com | `yrxmWjnW8cwQ1Ok_4dNx8w` | ~25 |
| Lex Feddern | Lexfeddern@gmail.com | `rM5HsHjKVu830QEbx9H6LA`, `0zCh_r8TcL06Qw0o_t3jRg` | ~20 |
| Brooklyn Colvin | brcolvin19@cox.net | `wrEL4mFEGMSfX3va0aczsw` | ~15 |
| Leslei Botello | Lesleistyled222@gmail.com | `bGYaKRR7h7puSB7y1B5y4Q` | ~10 |
| Kylie Walstad | drty_blnd@outlook.com | `fsswT6HTZ7sjgjpaYReotw` | ~10 |
| Mallori Schwab | (no email) | `okFio2OdqJaslQjudENerg`, `YiPQjZ-Ck9wMZ33KJcH8Tg` | ~10 |
| Julia Gross | (no email) | `JBIpYAt3DR85aHvHucHlcg` | ~5 |
| Kitty Vargas | kitty@palerabbit.io | `UpCncTTqXkoDS-irO7awlw` | ~5 |
| DROP DEAD (salon account) | kristi@dropdeadsalon.com | `DghGuOph2ZxCmit1L1Ir2A`, `oJt8KVaMuMXjfeVQEfHpaA` | — |

Note: Several staff have **two Phorest IDs** because they appear in both branches.

### Group C: "DROP DEAD" Entries

Two Phorest staff entries named "DROP DEAD" with Kristi's salon email. These are likely the salon's generic/walk-in account, not a real person. These can either be mapped to Kristi or left unmapped.

---

### What You Need to Decide

1. **Which of these 25 staff should get Zura employee profiles?** All of them? Only currently active ones? You know your team -- some of these might be former employees still in Phorest.

2. **Should Kristi Day get an employee profile in Zura?** She's the owner but doesn't have one yet. If yes, we need her to sign up or we create a profile for her.

3. **What about the "DROP DEAD" generic accounts?** Map to Kristi, ignore, or create a placeholder?

### Implementation Plan (Once You Confirm)

1. **Create employee profiles** for confirmed staff (either via the invite flow or direct database insert for historical mapping purposes)
2. **Insert mappings** into `phorest_staff_mapping` with `phorest_staff_id`, `phorest_staff_name`, `phorest_staff_email`, and `user_id`
3. **Backfill `staff_user_id`** across `phorest_appointments`, `appointments`, `transactions`, and `daily_sales_summary` using the new mappings
4. **Backfill `stylist_name`** on `phorest_transaction_items` from the mapping table

This would resolve Gap 1 (staff attribution) and enable per-stylist analytics, commission tracking, and performance dashboards.

### Technical Detail

For staff with two Phorest IDs (one per branch), both IDs map to the same `user_id`. The mapping table already supports this -- each row is a `phorest_staff_id -> user_id` pair, so one user can have multiple Phorest IDs.


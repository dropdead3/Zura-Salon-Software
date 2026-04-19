
## Wave 28.10 — Policy Acknowledgments

Capture client acknowledgment of policies on the public Policy Center, closing the loop from Policy OS → public surface → recorded consent. This creates the audit trail required for fee enforcement (cancellation, no-show, redo eligibility).

### Build sequence

| Step | Scope | Files |
|---|---|---|
| **1. Schema** | New `policy_acknowledgments` table: `id`, `organization_id`, `policy_id`, `policy_version_id`, `policy_variant_id`, `client_id` (nullable), `client_email`, `client_name`, `acknowledged_at`, `ip_address`, `user_agent`, `signature_text` (typed name), `acknowledgment_method` (typed/checkbox/click), `appointment_id` (nullable, for booking-flow acks). RLS: org members read; public insert via edge function only. | New migration |
| **2. Edge function** | `record-policy-acknowledgment` — public endpoint. Validates org+policy+variant exist and variant is approved client-facing. Inserts ack row with IP/UA from request headers. Returns ack id + timestamp. Rate-limited per IP. | New edge function |
| **3. Acknowledgment hook** | `useRecordPolicyAcknowledgment.ts` — client-side mutation calling the edge function. `useClientAcknowledgments(clientEmail, orgId)` for "already acknowledged" lookup. | New hooks |
| **4. PolicyCenterCard upgrade** | Add optional "Acknowledge" footer when policy requires acknowledgment (new `requires_acknowledgment` flag on `policies`). Shows: typed-name input + "I acknowledge" checkbox + Submit. On success: green confirmation with timestamp. Disabled state if already acknowledged (looked up by email). | Edited |
| **5. Email capture modal** | First-time acknowledgers see lightweight `AcknowledgeIdentityModal.tsx` capturing name + email before submit. Stored in `localStorage` for session reuse. No account required. | New component |
| **6. Operator visibility** | New `PolicyAcknowledgmentsPanel.tsx` in Policy Configurator → "Acknowledgments" tab. Shows ack count, recent signers (name, email, date, IP), CSV export. | New component + hook |
| **7. Policy flag** | Add `requires_acknowledgment BOOLEAN DEFAULT false` to `policies`. Toggle in `PolicyConfiguratorPanel` header (operator opt-in per policy). | Schema + edited |
| **8. Page integration** | `ClientPolicyCenter` shows banner at top: "X policies require your acknowledgment" when applicable. Auto-scrolls to first un-acknowledged. | Edited |

### Doctrine checks
- ✅ Visibility contract: acknowledgment UI only renders when `requires_acknowledgment=true` AND variant is approved client-facing
- ✅ Tenant isolation: org_id resolved server-side from policy_id; never trusted from client
- ✅ Single source of truth: ack stores `policy_version_id` snapshot — proves which version was acknowledged
- ✅ Audit: IP, UA, timestamp, signature text, method all captured immutably
- ✅ Public surface security: insert-only via edge function, no direct table access from anon role
- ✅ Recommend → Approve → Execute: operator must explicitly toggle `requires_acknowledgment` per policy
- ✅ UI tokens, Termina headers, font-medium max, no hype copy

### Out of scope
- Cryptographic signature (DocuSign-style) — Phase 4
- Re-acknowledgment prompts on policy version change — separate wave
- SMS/email confirmation of ack — uses existing notification governance, deferred
- Bulk operator-side ack invalidation — Phase 3 admin tool
- Webhook/API export for legal teams — Phase 4

After 28.10: **Wave 28.11 — Acknowledgment-Gated Booking** (require client ack of cancellation policy before deposit capture).

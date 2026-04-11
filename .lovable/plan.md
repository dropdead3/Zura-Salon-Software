

# Predicted Revenue Engine

## What It Does

A deterministic prediction layer that computes expected incremental revenue lift per SEO object and campaign, using baseline POS data, task-type impact coefficients, weakness-adjusted weights, and momentum modifiers. Outputs low/expected/high confidence bands. Updates as tasks complete.

## Architecture

```text
Baseline (30d POS)          Task Impact Coefficients
     │                              │
     ├── Weakness Adjustment ◄──── Health Scores
     │                              │
     ├── Momentum Modifier ◄────── Momentum Calculator
     │                              │
     ▼                              ▼
  Predicted Booking Lift × Avg Ticket = Revenue Lift
     │
     ├── Low / Expected / High bands
     ├── Confidence level (high/medium/low)
     └── Explanation factors
```

## Data Sources (All Existing)

- **Appointments table**: `location_id`, `service_category`, `appointment_date`, `total_price`, `status` → 30d baseline bookings + avg ticket
- **seo_object_revenue**: Rolling 30d revenue snapshots per SEO object
- **seo_health_scores**: Current weakness signals (review, content, page, conversion domains)
- **Momentum calculator**: Directional score per object
- **seo_campaigns + seo_tasks**: Pending/completed task counts by template type

## New Files

| File | Purpose |
|---|---|
| `src/lib/seo-engine/seo-revenue-predictor.ts` | Pure computation: baseline → coefficients → weakness adjustment → momentum modifier → prediction bands |
| `src/hooks/useSEORevenuePrediction.ts` | Hook that fetches baseline data + health scores + momentum, feeds into predictor |
| `src/components/dashboard/seo-workshop/SEOPredictedLiftCard.tsx` | Dashboard card: object-level "Opportunity: +$6,800 → $12,400" display |
| `src/components/dashboard/seo-workshop/SEOCampaignPrediction.tsx` | Campaign-level prediction block inside campaign detail dialog |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add `SEOPredictedLiftCard` after Momentum Signals |
| `src/components/dashboard/seo-workshop/SEOCampaignDetailDialog.tsx` | Add `SEOCampaignPrediction` block showing predicted revenue lift for the campaign |
| `src/lib/seo-engine/index.ts` | Export predictor functions |

## Prediction Model (Deterministic)

### Step 1: Baseline
- Query appointments for 30d: count completed bookings, compute avg ticket per location-service
- Fallback: use `seo_object_revenue.total_revenue / transaction_count` if appointments sparse

### Step 2: Task-Type Impact Coefficients
Each template type gets a base lift range (% of baseline bookings):

| Template | Low | Expected | High |
|---|---|---|---|
| `review_request` | 1% | 3% | 5% |
| `photo_upload` | 0.5% | 2% | 4% |
| `page_completion` | 2% | 5% | 8% |
| `faq_expansion` | 0.5% | 1.5% | 3% |
| `gbp_post` | 0.5% | 1.5% | 3% |
| `service_description_rewrite` | 1% | 2.5% | 4% |
| `booking_cta_optimization` | 2% | 4% | 7% |
| `before_after_publish` | 1% | 2% | 4% |

### Step 3: Weakness Adjustment
- If review health score < 40 → review task coefficients × 1.5
- If content health score < 40 → content task coefficients × 1.4
- If conversion health score < 40 → conversion task coefficients × 1.6
- If score > 80 → corresponding coefficients × 0.6 (diminishing returns)

### Step 4: Momentum Modifier
- Momentum score > 30 ("gaining fast") → multiply all coefficients × 0.7 (diminishing returns)
- Momentum score < -30 ("losing") → multiply × 1.3 (more upside potential)
- Between → × 1.0

### Step 5: Compute Lift
For each pending task in a campaign or on an object:
- `adjustedLiftPct = baseCoefficient × weaknessMultiplier × momentumMultiplier`
- `predictedBookingLift = baselineBookings × adjustedLiftPct`
- `predictedRevenueLift = predictedBookingLift × avgTicket`

Sum across all pending tasks for campaign-level prediction.

### Step 6: Confidence Band
- Output: `{ low, expected, high }` revenue values
- Confidence level based on: baseline data volume (≥20 bookings = high), health score data freshness, momentum data availability

## UI Surfaces

### Dashboard Card (`SEOPredictedLiftCard`)
Shows top 3 objects by predicted opportunity:
```
Extensions (Gilbert)
Current Revenue: $18,400  ·  Opportunity: +$6,800 → $12,400
Momentum: ↑ Gaining  ·  Top Action: Complete "Own Extensions" campaign
```

### Campaign Prediction (`SEOCampaignPrediction`)
Inside campaign detail dialog:
```
Expected Lift (30d):
+$6,800 → $12,400
Progress: 3/5 actions complete
Remaining Impact: +$4,900
Confidence: Medium — based on 24 bookings in baseline
```

### Safety Layer
Every prediction includes:
- Confidence level badge
- One-line reason summary
- "Actual results may vary based on seasonality and execution quality" disclaimer on hover

## No AI Involvement
All prediction values are deterministic. AI is never consulted for lift calculations. Coefficients are config-driven and tunable via `seo-effectiveness-tracker` historical data when sample sizes are sufficient.


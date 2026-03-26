

## Clarify Allowance Calculator as a Benchmarking Tool

### Problem
The current copy implies the allowance calculator determines which products a stylist can use. In reality, it's a **benchmarking tool** — you pick sample products to calculate a dollar budget. The stylist can use whatever products they want for the client; once the dollar amount is exceeded, overages are charged to the client.

### Changes — `AllowanceCalculatorDialog.tsx`

1. **Tooltip text** (line 636): Rewrite to emphasize this is a calculator for setting a dollar budget, not a product restriction:
   > "Use this tool to set a dollar allowance for this service. Pick sample products as benchmarks to calculate cost — stylists aren't limited to these products. During a service, they can mix whatever the client needs. Once the allowance amount is reached, any additional product cost is charged to the client as an overage fee."

2. **Dialog subtitle** (line 641): Change from "Build sample bowls to calculate the included product cost" to something like:
   > "{serviceName} — Use sample products as benchmarks to set the included dollar allowance."

3. **Empty state primary text** (line 701): Change from "Add products to build a sample formula" to:
   > "Add benchmark products to calculate allowance"

4. **Empty state secondary text** (line 704): Change to:
   > "These products set the dollar amount — stylists can mix any product during the service."

5. **Footer label** (line 887): Keep "Total Allowance" but add a small helper beneath the weight line:
   > "This dollar amount will be the included allowance for this service."

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`


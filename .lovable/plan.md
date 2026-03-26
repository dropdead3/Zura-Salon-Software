

## Analysis: Vish Product Allowance Calculator vs Our Current Approach

### How Vish Does It
Vish calculates allowances **bottom-up from actual product compositions**, not as abstract weight numbers:

1. **Bowl-based**: Users build sample bowls with real products from their catalog
2. **Product + Developer pairs**: Each bowl contains color products (with weight quick-sets: 15g, 30g, 60g, 90g) and developers (with ratio buttons: 1x, 1.5x, 2x, Custom)
3. **Cost-driven**: Each product's cost is calculated as `weight × cost_per_gram` (shown from catalog data like "$0.17/g")
4. **Multi-bowl**: Services can have multiple bowls (e.g., "Bowl 1 of 2") — typical for complex services like "3+ Color Blocks"
5. **Visual bowl fill**: Right sidebar shows a visual bowl representation with fill level
6. **Total = Allowance**: The sum across all bowls becomes the service's "Product Allowance" dollar amount ($36.51 in the example)
7. **Save persists**: The total is saved as the service's included allowance

### What We Currently Have
Our inline editor is a **simple abstract picker**: choose a weight (15g–90g) and an overage rate ($/g). It doesn't reference actual products, bowls, or real costs.

### The Gap
Our model stores `included_allowance_qty` (weight) + `overage_rate` — Vish stores a **recipe of actual products with quantities that sum to a dollar allowance**. This is fundamentally more useful because it ties the allowance to real product costs and realistic service compositions.

### No Changes Proposed Yet
This is an analysis per your request. When you're ready to discuss building a Vish-style bowl-based allowance calculator, we can plan it — it would involve a new dialog/page, product selection from the catalog, developer ratio logic, multi-bowl state management, and a revised allowance data model.


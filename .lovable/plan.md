

# Move Coach Dashboard Out of "Products" Nav Group

## Problem
"Coach Dashboard" was placed under the "Products" sidebar group, which is reserved for paid, gated products in the Zura ecosystem. The Coach Dashboard is an internal platform tool for assigned coaches — not a product.

## Proposed Change

**`src/config/platformNav.ts`**: Move the Coach Dashboard entry from the "Products" group to the "Operations" group, where it sits alongside other operational tools like Onboarding, Migrations, and Scheduled Jobs. It already has no `platformRoles` restriction, so any platform user can see it — but it could optionally be scoped to coaches only via a future visibility check.

New placement:

```
Operations
├── Onboarding
├── Migrations
├── Scheduled Jobs
└── Coach Dashboard   ← moved here
```

Single line move in one file.


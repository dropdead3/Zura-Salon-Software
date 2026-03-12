

# Move Inventory Leads Card into Inventory Tab & Reorder Tabs

## Changes — single file: `RetailProductsSettingsContent.tsx`

1. **Remove** the top-level `<InventoryCoverageBanner />` and `<InventoryLeadAssignmentCard />` (lines 1703–1705).

2. **Add** both components inside the `inventory` TabsContent (line 1730), above `<InventoryByLocationTab />`:
   ```tsx
   <TabsContent value="inventory" className="mt-4">
     <InventoryCoverageBanner />
     <InventoryLeadAssignmentCard />
     <InventoryByLocationTab />
   </TabsContent>
   ```

3. **Change** `defaultValue="products"` → `defaultValue="inventory"` on the `<Tabs>` component (line 1707).

4. **Reorder** TabsTriggers so `inventory` is first in the list:
   ```tsx
   <TabsTrigger value="inventory" ...> Inventory</TabsTrigger>
   <TabsTrigger value="products" ...> Products</TabsTrigger>
   <TabsTrigger value="brands">Brands</TabsTrigger>
   <TabsTrigger value="categories">Categories</TabsTrigger>
   <TabsTrigger value="clearance" ...> Clearance</TabsTrigger>
   <TabsTrigger value="gift-cards" ...> Gift Cards</TabsTrigger>
   ```


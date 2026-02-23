
## Move Filters and Export Button Inside the Table Card

### Change

Move the filter row (Status, Location, Stylist dropdowns + CSV export button) and the dynamic filter description line from their current standalone positions into the top of the main table `Card`. This consolidates the controls with the data they govern, creating a cleaner, more cohesive layout.

### Visual Structure

```text
[ Search Bar ]                       [ All | Past | Today | Future | Range ]

+-----------------------------------------------------------------------+
|  [ All Statuses v ]  [ All Locations v ]  [ All Stylists v ]  [ CSV ] |
|  Showing 661 all appointments, sorted by date (newest first)          |
|-----------------------------------------------------------------------|
|  [ ] Date   Time   Client   ...                                       |
+-----------------------------------------------------------------------+
```

### Technical Details

**File:** `src/components/dashboard/appointments-hub/AppointmentsList.tsx`

1. **Remove** the standalone "Row 2: Filters + CSV" `div` (lines 291-336) and the standalone filter description `p` (lines 338-341) from their current positions outside the Card
2. **Insert** both elements inside the table `Card` (currently line 344), before the `Table` element:
   - The filter row becomes a `div` with `flex flex-wrap gap-3 items-center p-4 pb-2` inside the Card
   - The filter description becomes a `p` with `text-sm text-muted-foreground font-sans px-4 pb-3` inside the Card
   - Then the existing `Table` follows
3. No logic changes -- just moving the JSX blocks into the Card wrapper

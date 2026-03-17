

# Clean Up Erroneous Danger Jones "Liquid Semi-Permanent" Entries

## Problem
Two inactive, empty entries named "Liquid Semi-Permanent" exist in the `supply_library_products` table for Danger Jones (IDs: `9cb569c2-8600-4e28-9b6c-9fb1855735d5` and `fc3ced57-2256-4542-a628-2e154f784335`). These are product line names, not actual shades, and they create a misleading "Liquid" grouping section in the UI.

## Change
Delete both rows from `supply_library_products` using the data insert tool.


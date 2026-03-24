

## Conditionally Show Bottom Gradient Only on Schedule Tab

### Change — `src/components/dock/DockLayout.tsx` (line 117–118)

The bottom fade gradient is currently always visible. Wrap it with a condition so it only renders when `activeTab === 'schedule'`:

```tsx
{/* Bottom fade gradient — schedule tab only */}
{activeTab === 'schedule' && (
  <div className="absolute bottom-0 inset-x-0 h-24 z-20 pointer-events-none bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent" />
)}
```

One line wrapped in a conditional, one file.


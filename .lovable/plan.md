

## Update Hamburger Menu Active State Styling

### Change — `src/components/dock/DockHamburgerMenu.tsx`

**Lines 110–118:**

1. Change `rounded-xl` to `rounded-full` on the nav button for a fully rounded pill highlight
2. Remove the left accent bar (`absolute left-0 top-2 bottom-2 w-0.5 ...`)
3. Add a small violet dot on the right side of the active item using `ml-auto`

```tsx
<button
  key={id}
  onClick={() => handleTabSelect(id)}
  className={cn(
    'relative w-full flex items-center gap-4 px-4 py-3 rounded-full transition-colors',
    isActive
      ? 'bg-violet-500/[0.12] text-violet-300'
      : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.05)]'
  )}
>
  <Icon className={cn('w-5 h-5', isActive ? 'text-violet-400' : '')} />
  <span className={cn(
    'font-display text-sm tracking-wide uppercase',
    isActive ? 'text-violet-300' : ''
  )}>
    {label}
  </span>
  {isActive && (
    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
  )}
</button>
```

One file, one section. Pill shape + right-side dot replaces left accent bar.


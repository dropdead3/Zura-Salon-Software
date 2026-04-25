import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { formatDisplayName } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface OrgLoginUserGridProps {
  members: Array<{
    user_id: string;
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
  }>;
  /**
   * User IDs that signed in on this device recently — those tiles bubble to
   * the top so a 200-stylist enterprise grid is still navigable. Order
   * matters: index 0 is the most recent.
   */
  recentUserIds?: string[];
  onSelect: (userId: string) => void;
}

const SEARCH_THRESHOLD = 12; // Show search input only when grid is non-trivial

/**
 * Avatar grid for shared-device mode. User taps their face → PIN pad appears.
 *
 * Scale-aware: at 100+ stylists the operator can search by name, and recently
 * signed-in faces float to the top so the front-desk iPad isn't a wall of
 * unfamiliar photos.
 */
export function OrgLoginUserGrid({ members, recentUserIds = [], onSelect }: OrgLoginUserGridProps) {
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    if (recentUserIds.length === 0) return members;
    const recencyRank = new Map(recentUserIds.map((id, i) => [id, i]));
    return [...members].sort((a, b) => {
      const ar = recencyRank.has(a.user_id) ? recencyRank.get(a.user_id)! : Infinity;
      const br = recencyRank.has(b.user_id) ? recencyRank.get(b.user_id)! : Infinity;
      if (ar !== br) return ar - br;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [members, recentUserIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((m) => {
      const name = formatDisplayName(m.full_name, m.display_name).toLowerCase();
      return name.includes(q);
    });
  }, [sorted, search]);

  if (members.length === 0) {
    return (
      <p className="text-sm text-white/60 text-center font-sans">
        No team members with a PIN yet. An admin can set PINs from the dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {members.length >= SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${members.length} team members…`}
            className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500 font-sans"
            aria-label="Search team members"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-white/50 text-center py-6 font-sans">
          No matches for &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto px-1 py-1">
          {filtered.map((m, idx) => {
            const name = formatDisplayName(m.full_name, m.display_name);
            const initials = name
              .split(' ')
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <motion.button
                key={m.user_id}
                type="button"
                onClick={() => onSelect(m.user_id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.10] hover:border-white/20 transition-colors"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-white font-display tracking-wide">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base">{initials || '?'}</span>
                  )}
                </div>
                <span className="text-xs text-white/80 text-center leading-tight font-sans line-clamp-2">
                  {name.split(' ')[0]}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

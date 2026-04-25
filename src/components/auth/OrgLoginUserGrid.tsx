import { motion } from 'framer-motion';
import { formatDisplayName } from '@/lib/utils';

interface OrgLoginUserGridProps {
  members: Array<{
    user_id: string;
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
  }>;
  onSelect: (userId: string) => void;
}

/**
 * Avatar grid for shared-device mode. User taps their face → PIN pad appears.
 */
export function OrgLoginUserGrid({ members, onSelect }: OrgLoginUserGridProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-white/60 text-center">
        No team members with a PIN yet. An admin can set PINs from the dashboard.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto px-1 py-1">
      {members.map((m, idx) => {
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
  );
}

import { motion } from 'framer-motion';
import { User, X } from 'lucide-react';
import type { RememberedDeviceUser } from '@/lib/orgLoginDeviceMemory';

interface OrgLoginRecentTilesProps {
  users: RememberedDeviceUser[];
  onSelect: (user: RememberedDeviceUser) => void;
  onForget: (userId: string) => void;
}

/**
 * Compact 1–3 avatar tile picker for households sharing one device.
 * Shown above the standard personal/shared chooser when recents exist.
 */
export function OrgLoginRecentTiles({ users, onSelect, onForget }: OrgLoginRecentTilesProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {users.map((u, idx) => {
        const initials = u.display_name
          .split(' ')
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <motion.div
            key={u.user_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="relative group"
          >
            <motion.button
              type="button"
              onClick={() => onSelect(u)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.10] hover:border-white/20 transition-colors min-w-[96px]"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-white">
                {u.photo_url ? (
                  <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
                ) : initials ? (
                  <span className="text-base font-display tracking-wide">{initials}</span>
                ) : (
                  <User className="w-7 h-7 text-white/60" />
                )}
              </div>
              <span className="text-xs text-white/80 font-sans leading-tight max-w-[88px] truncate">
                {u.display_name.split(' ')[0]}
              </span>
            </motion.button>
            <button
              type="button"
              aria-label={`Forget ${u.display_name}`}
              onClick={(e) => {
                e.stopPropagation();
                onForget(u.user_id);
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/10 hover:bg-white/30 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

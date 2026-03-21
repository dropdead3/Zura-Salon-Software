import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ExternalLink, Info, ShieldAlert } from 'lucide-react';
import { useActiveIncident } from '@/hooks/useActiveIncident';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'incident-dismissed';

function getDismissedInfo(): { id: string; updatedAt: string } | null {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function IncidentBanner() {
  const { data: incident } = useActiveIncident();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state if incident changed or was updated
  useEffect(() => {
    if (!incident) {
      setDismissed(false);
      return;
    }
    const info = getDismissedInfo();
    if (info && info.id === incident.id && info.updatedAt === incident.updated_at) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [incident]);

  if (!incident || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ id: incident.id, updatedAt: incident.updated_at })
    );
    setDismissed(true);
  };

  const severityConfig = {
    critical: {
      bg: 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600',
      text: 'text-white',
      icon: ShieldAlert,
      iconBg: 'bg-white/20',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500',
      text: 'text-amber-950',
      icon: AlertTriangle,
      iconBg: 'bg-amber-950/15',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600',
      text: 'text-white',
      icon: Info,
      iconBg: 'bg-white/20',
    },
  };

  const config = severityConfig[incident.severity as keyof typeof severityConfig] || severityConfig.warning;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(config.bg, config.text, 'relative overflow-hidden shadow-lg z-[60]')}
      >
        {/* Animated stripe pattern */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
          }}
          animate={{ backgroundPosition: ['0px 0px', '40px 0px'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative z-10 flex items-center justify-center gap-3 py-2.5 px-4">
          <div className={cn('p-1.5 rounded-full', config.iconBg)}>
            <Icon className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2 text-sm font-medium">
            {incident.title && (
              <span className="font-medium">{incident.title}:</span>
            )}
            <span>{incident.message}</span>
          </div>

          {incident.link_url && (
            <a
              href={incident.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:no-underline ml-1',
                config.text
              )}
            >
              {incident.link_text || 'Learn more'}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            onClick={handleDismiss}
            className={cn(
              'ml-2 p-1 rounded-full hover:bg-black/10 transition-colors',
              config.text
            )}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

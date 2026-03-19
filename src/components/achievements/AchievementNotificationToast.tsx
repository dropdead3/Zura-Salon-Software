import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Bell, Flame, GraduationCap, Trophy, Crown, 
  Heart, Star, Users, Medal, HandMetal, X 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
}

interface AchievementNotificationToastProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Bell,
  Flame,
  GraduationCap,
  Trophy,
  Crown,
  Heart,
  Star,
  Users,
  Medal,
  HandMetal,
};

export function AchievementNotificationToast({
  achievement,
  isVisible,
  onClose,
}: AchievementNotificationToastProps) {
  const IconComponent = iconMap[achievement.icon] || Award;

  useEffect(() => {
    if (isVisible) {
      // Trigger confetti celebration
      const duration = 2000;
      const end = Date.now() + duration;

      const colors = [achievement.badge_color, '#FFD700', '#FFA500'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, achievement.badge_color, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
        >
          <div className="relative bg-gradient-to-br from-background via-background to-muted border border-border/50 rounded-lg shadow-2xl overflow-hidden min-w-[320px] max-w-[400px]">
            {/* Glow effect */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${achievement.badge_color}, transparent 70%)`,
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="relative p-6">
              {/* Badge icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2, damping: 10 }}
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${achievement.badge_color}20` }}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                >
                  <IconComponent
                    className="w-8 h-8"
                    style={{ color: achievement.badge_color }}
                  />
                </motion.div>
              </motion.div>

              {/* Achievement unlocked label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <span className="text-xs font-display tracking-widest uppercase text-muted-foreground">
                  Achievement Unlocked!
                </span>
              </motion.div>

              {/* Achievement name */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-display text-center mt-2"
                style={{ color: achievement.badge_color }}
              >
                {achievement.name}
              </motion.h3>

              {/* Achievement description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground text-center mt-2 font-sans"
              >
                {achievement.description}
              </motion.p>

              {/* Sparkle decorations */}
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 left-8 w-2 h-2 rounded-full"
                style={{ backgroundColor: achievement.badge_color }}
              />
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-8 right-10 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: achievement.badge_color }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

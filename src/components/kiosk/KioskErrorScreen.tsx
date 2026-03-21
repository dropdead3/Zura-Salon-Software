import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { cn } from '@/lib/utils';

export function KioskErrorScreen() {
  const { settings, error, resetToIdle, locationName } = useKiosk();

  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const backgroundOverlayOpacity = settings?.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity;
  const logoUrl = settings?.logo_url;

  // Location badge settings
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;

  // Determine badge position for layout adjustments
  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  const errorColor = '#EF4444';

  return (
    <motion.div
      className="fixed inset-0 flex flex-col select-none"
      style={{
        backgroundColor,
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background overlay */}
      {backgroundImageUrl && (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOverlayOpacity})` }}
        />
      )}

      {/* Top Badge Zone */}
      {badgeAtTop && (
        <div className="relative z-20 pt-8">
          <KioskLocationBadge
            locationName={locationName!}
            position={badgePosition}
            style={badgeStyle}
            textColor={textColor}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 max-w-lg mx-auto",
        badgeAtBottom && "pb-20"
      )}>
        {/* Logo */}
        {logoUrl && (
          <motion.img
            src={logoUrl}
            alt="Logo"
            className="h-16 mb-10 object-contain"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          />
        )}

        {/* Error icon - glass style */}
        <motion.div
          className="relative w-28 h-28 mb-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {/* Icon container */}
          <div 
            className="absolute inset-0 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ 
              backgroundColor: `${errorColor}15`,
              border: `1.5px solid ${errorColor}30`,
            }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <AlertTriangle className="w-14 h-14" style={{ color: errorColor }} />
            </motion.div>
          </div>
        </motion.div>

        {/* Error message */}
        <motion.h1
          className="text-4xl md:text-5xl font-medium mb-4 tracking-tight"
          style={{ color: textColor }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Something Went Wrong
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl mb-10 font-light leading-relaxed"
          style={{ color: `${textColor}90` }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {error || 'We encountered an issue. Please try again or ask for assistance.'}
        </motion.p>

        {/* Actions - glass style */}
        <motion.div
          className="flex flex-col gap-4 w-full"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-xl font-medium backdrop-blur-md transition-all"
            style={{
              backgroundColor: `${accentColor}15`,
              border: `1.5px solid ${accentColor}40`,
              color: textColor,
            }}
            onClick={resetToIdle}
            whileHover={{ 
              scale: 1.02, 
              y: -2,
              backgroundColor: `${accentColor}25`,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-6 h-6" />
            </motion.div>
            Try Again
          </motion.button>

          <motion.div 
            className="flex items-center justify-center gap-3 py-4 rounded-2xl backdrop-blur-md"
            style={{ 
              backgroundColor: `${textColor}05`,
              border: `1px solid ${textColor}10`,
              color: `${textColor}70`,
            }}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-lg">Or ask the front desk for help</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Badge Zone */}
      {badgeAtBottom && (
        <div className="relative z-20 pb-8">
          <KioskLocationBadge
            locationName={locationName!}
            position={badgePosition}
            style={badgeStyle}
            textColor={textColor}
            accentColor={accentColor}
          />
        </div>
      )}
    </motion.div>
  );
}

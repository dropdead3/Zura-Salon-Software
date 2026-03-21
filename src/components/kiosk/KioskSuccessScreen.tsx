import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, User, Sparkles } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { parse } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

export function KioskSuccessScreen() {
  const { formatDate } = useFormatDate();
  const { settings, session, completeCheckin, isCheckingIn, locationName } = useKiosk();
  const [hasCompleted, setHasCompleted] = useState(false);

  const successMessage = settings?.success_message || DEFAULT_KIOSK_SETTINGS.success_message;
  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const backgroundOverlayOpacity = settings?.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity;
  const logoUrl = settings?.logo_url;
  const showWaitTime = settings?.show_wait_time_estimate ?? DEFAULT_KIOSK_SETTINGS.show_wait_time_estimate;
  const enableGlowEffects = settings?.enable_glow_effects ?? DEFAULT_KIOSK_SETTINGS.enable_glow_effects;

  // Location badge settings
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;

  // Determine badge position for layout adjustments
  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  const appointment = session?.selectedAppointment;
  const client = session?.client;
  const clientFirstName = client?.name?.split(' ')[0] || '';

  // Complete check-in on mount
  useEffect(() => {
    if (!hasCompleted && !isCheckingIn) {
      setHasCompleted(true);
      completeCheckin();
    }
  }, [hasCompleted, isCheckingIn, completeCheckin]);

  const formatTime = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm:ss', new Date());
      return formatDate(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col select-none overflow-hidden"
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

      {/* Celebration particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: accentColor,
              left: `${10 + (i * 7)}%`,
              top: '-5%',
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ 
              y: ['0vh', '110vh'],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'linear',
            }}
          />
        ))}
      </div>

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
        "relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8",
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

        {/* Success animation - glass style */}
        <motion.div
          className="relative mb-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          {/* Icon container with glass effect */}
          <motion.div
            className="relative w-36 h-36 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ 
              backgroundColor: `${accentColor}15`,
              border: `2px solid ${accentColor}40`,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 12,
                delay: 0.4,
              }}
            >
              <CheckCircle2 
                className="w-20 h-20"
                style={{ color: accentColor }}
                strokeWidth={1.5}
              />
            </motion.div>
          </motion.div>

          {/* Sparkles */}
          <motion.div
            className="absolute -top-2 -right-2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
          >
            <Sparkles className="w-8 h-8" style={{ color: accentColor }} />
          </motion.div>
        </motion.div>

        {/* Welcome message */}
        <motion.h1
          className="text-5xl md:text-6xl font-medium mb-4 tracking-tight"
          style={{ color: textColor }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {clientFirstName ? `Thanks, ${clientFirstName}!` : 'Check-In Complete!'}
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl mb-10 max-w-lg font-light"
          style={{ color: `${textColor}90` }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {successMessage}
        </motion.p>

        {/* Appointment details - glass card */}
        {appointment && (
          <motion.div
            className="p-8 rounded-3xl max-w-md w-full backdrop-blur-md"
            style={{ 
              backgroundColor: `${textColor}08`,
              border: `1.5px solid ${textColor}20`,
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
          >
            <div className="space-y-4">
              <div 
                className="text-2xl md:text-3xl font-medium"
                style={{ color: textColor }}
              >
                {appointment.service_name}
              </div>
              
              <div className="flex items-center justify-center gap-8">
                <div 
                  className="flex items-center gap-3"
                  style={{ color: `${textColor}90` }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{ 
                      backgroundColor: `${accentColor}15`,
                      border: `1px solid ${accentColor}30`,
                    }}
                  >
                    <Clock className="w-5 h-5" style={{ color: accentColor }} />
                  </div>
                  <span className="text-xl font-medium">{formatTime(appointment.start_time)}</span>
                </div>
                
                {appointment.stylist_name && (
                  <div 
                    className="flex items-center gap-3"
                    style={{ color: `${textColor}90` }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                      style={{ 
                        backgroundColor: `${accentColor}15`,
                        border: `1px solid ${accentColor}30`,
                      }}
                    >
                      <User className="w-5 h-5" style={{ color: accentColor }} />
                    </div>
                    <span className="text-xl">{appointment.stylist_name}</span>
                  </div>
                )}
              </div>

              {showWaitTime && (
                <motion.div 
                  className="text-lg mt-6 pt-6 font-medium"
                  style={{ 
                    color: accentColor,
                    borderTopColor: `${textColor}15`,
                    borderTopWidth: 1,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Please have a seat. Your stylist will be with you shortly.
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Auto-return indicator */}
        <motion.div
          className="mt-10 flex items-center gap-2"
          style={{ color: `${textColor}60` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              enableGlowEffects ? (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: textColor }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ) : (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: textColor, opacity: 0.4 }}
                />
              )
            ))}
          </div>
          <span className="text-sm">This screen will reset automatically</span>
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

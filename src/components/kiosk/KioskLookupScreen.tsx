import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Phone, Settings } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { KioskNumberPad } from './KioskNumberPad';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskSettingsDialog } from './KioskSettingsDialog';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { cn } from '@/lib/utils';

export function KioskLookupScreen() {
  const { settings, resetToIdle, lookupByPhone, isLookingUp, idleTimeRemaining, locationName } = useKiosk();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const checkInPrompt = settings?.check_in_prompt || DEFAULT_KIOSK_SETTINGS.check_in_prompt;
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

  const handleSettingsTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  };

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleSubmit = () => {
    if (phoneNumber.length >= 4) {
      lookupByPhone(phoneNumber);
    }
  };

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
      {/* Settings icon - hidden in corner */}
      <motion.button
        className="absolute top-4 right-4 z-30 w-12 h-12 rounded-xl flex items-center justify-center transition-all"
        style={{ 
          backgroundColor: `${textColor}08`,
          opacity: 0.3,
        }}
        onClick={handleSettingsTap}
        whileTap={{ scale: 0.95 }}
      >
        <Settings className="w-5 h-5" style={{ color: textColor }} />
      </motion.button>

      <KioskSettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Background overlay */}
      {backgroundImageUrl && (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOverlayOpacity})` }}
        />
      )}

      {/* Top Badge Zone */}
      {badgeAtTop && (
        <div className="relative z-20 pt-6">
          <KioskLocationBadge
            locationName={locationName!}
            position={badgePosition}
            style={badgeStyle}
            textColor={textColor}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "relative z-10 flex items-center justify-between p-6",
        badgeAtTop && "pt-4"
      )}>
        <motion.button
          className="flex items-center gap-2 px-5 py-3 rounded-2xl backdrop-blur-md transition-all"
          style={{ 
            backgroundColor: `${textColor}10`,
            border: `1.5px solid ${textColor}20`,
            color: textColor,
          }}
          onClick={resetToIdle}
          whileHover={{ backgroundColor: `${textColor}18` }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg font-medium">Cancel</span>
        </motion.button>

        {logoUrl && (
          <motion.img 
            src={logoUrl} 
            alt="Logo" 
            className="h-12 object-contain"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          />
        )}

        {/* Idle timer */}
        {idleTimeRemaining > 0 && idleTimeRemaining < 30 && (
          <motion.div 
            className="px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-md"
            style={{ 
              backgroundColor: `${accentColor}15`,
              border: `1.5px solid ${accentColor}30`,
              color: accentColor,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {idleTimeRemaining}s
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "relative z-10 flex-1 flex flex-col items-center justify-center px-8",
        badgeAtBottom && "pb-20"
      )}>
        {/* Prompt with icon */}
        <motion.div
          className="text-center mb-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div 
            className="relative w-20 h-20 mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            {/* Icon container - glass style */}
            <div 
              className="relative w-full h-full rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ 
                backgroundColor: `${accentColor}15`,
                border: `1.5px solid ${accentColor}40`,
              }}
            >
              <Phone className="w-10 h-10" style={{ color: accentColor }} />
            </div>
          </motion.div>
          
          <h1 
            className="text-3xl md:text-4xl font-medium tracking-tight"
            style={{ color: textColor }}
          >
            {checkInPrompt}
          </h1>
        </motion.div>

        {/* Phone display - glass style */}
        <motion.div
          className="mb-10 px-10 py-6 rounded-3xl min-w-[340px] text-center backdrop-blur-md"
          style={{ 
            backgroundColor: `${textColor}05`,
            border: `1.5px solid ${phoneNumber ? accentColor : `${textColor}20`}`,
            transition: 'all 0.3s ease',
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <span 
            className="text-4xl md:text-5xl font-light tracking-widest"
            style={{ color: phoneNumber ? textColor : `${textColor}40` }}
          >
            {phoneNumber ? formatPhoneDisplay(phoneNumber) : '(___) ___-____'}
          </span>
        </motion.div>

        {/* Number pad or loading */}
        {isLookingUp ? (
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="relative w-24 h-24"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 
                className="w-24 h-24"
                style={{ color: accentColor }}
              />
            </motion.div>
            <span 
              className="text-xl font-medium"
              style={{ color: textColor }}
            >
              Looking up your appointment...
            </span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 20 }}
          >
            <KioskNumberPad
              value={phoneNumber}
              onChange={setPhoneNumber}
              onSubmit={handleSubmit}
              accentColor={accentColor}
              textColor={textColor}
            />
          </motion.div>
        )}
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

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskSettingsDialog } from './KioskSettingsDialog';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { cn } from '@/lib/utils';

export function KioskIdleScreen() {
  const { settings, businessSettings, startSession, locationName } = useKiosk();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const welcomeTitle = settings?.welcome_title || DEFAULT_KIOSK_SETTINGS.welcome_title;
  const welcomeSubtitle = settings?.welcome_subtitle;
  const slideshowImages = settings?.idle_slideshow_images || [];
  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const backgroundVideoUrl = settings?.idle_video_url;
  const backgroundOverlayOpacity = settings?.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity;
  const enableGlowEffects = settings?.enable_glow_effects ?? DEFAULT_KIOSK_SETTINGS.enable_glow_effects;

  // Location badge settings
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;

  // Theme-aware logo fallback: kiosk logo → business logo (theme-aware) → business name
  const themeMode = settings?.theme_mode || DEFAULT_KIOSK_SETTINGS.theme_mode;
  const isDarkTheme = themeMode === 'dark' || 
    (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const logoUrl = settings?.logo_url 
    || (isDarkTheme ? businessSettings?.logo_light_url : businessSettings?.logo_dark_url)
    || null;
  
  const businessName = businessSettings?.business_name;
  const logoSize = settings?.logo_size || DEFAULT_KIOSK_SETTINGS.logo_size;
  const logoColor = settings?.logo_color || null;
  
  // Logo size classes
  const logoSizeClasses = {
    xs: 'max-h-12 md:max-h-16 max-w-[180px] md:max-w-[240px]',
    sm: 'max-h-16 md:max-h-20 max-w-[220px] md:max-w-[300px]',
    md: 'max-h-20 md:max-h-28 max-w-[280px] md:max-w-[400px]',
    lg: 'max-h-28 md:max-h-36 max-w-[340px] md:max-w-[480px]',
    xl: 'max-h-36 md:max-h-44 max-w-[400px] md:max-w-[560px]',
  };

  // Determine if badge is shown and its position for layout adjustments
  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Slideshow rotation
  useEffect(() => {
    if (slideshowImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slideshowImages.length]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle settings icon tap
  const handleSettingsTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col cursor-pointer select-none overflow-hidden"
      style={{
        backgroundColor,
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={startSession}
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
        <Settings 
          className="w-5 h-5" 
          style={{ color: textColor }}
        />
      </motion.button>

      {/* Settings Dialog */}
      <KioskSettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Video background */}
      {backgroundVideoUrl && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster={backgroundImageUrl || undefined}
        >
          <source src={backgroundVideoUrl} type="video/mp4" />
          <source src={backgroundVideoUrl} type="video/webm" />
        </video>
      )}

      {/* Background image (if no video) */}
      {!backgroundVideoUrl && backgroundImageUrl && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Background overlay (applies to both video and image) */}
      {(backgroundVideoUrl || backgroundImageUrl) && (
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: `rgba(0, 0, 0, ${backgroundOverlayOpacity})`,
          }}
        />
      )}

      {/* Slideshow */}
      {slideshowImages.length > 0 && !backgroundImageUrl && !backgroundVideoUrl && (
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={slideshowImages[currentImageIndex]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.3, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Top Badge Zone - part of flex flow */}
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

      {/* Content - flex-1 to take remaining space */}
      <div className={cn(
        "relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8",
        // Adjust vertical centering based on badge presence
        !badgeAtTop && !badgeAtBottom && "-mt-8"
      )}>
        {/* Logo with floating animation - or business name text fallback */}
        {logoUrl ? (
          <motion.div
            className="mb-12 flex items-center justify-center"
            initial={{ y: -30, opacity: 0 }}
            animate={{ 
              y: [0, -8, 0],
              opacity: 1,
            }}
            transition={{ 
              y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.5 },
            }}
          >
            <img
              src={logoUrl}
              alt={businessName || 'Logo'}
              className={`${logoSizeClasses[logoSize]} w-auto h-auto object-contain`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Color overlay for logo */}
            {logoColor && (
              <div 
                className="absolute inset-0 mix-blend-multiply pointer-events-none"
                style={{ 
                  backgroundColor: logoColor,
                  maskImage: `url(${logoUrl})`,
                  WebkitMaskImage: `url(${logoUrl})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                }}
              />
            )}
          </motion.div>
        ) : businessName ? (
          <motion.h2
            className="text-3xl md:text-4xl font-light tracking-widest uppercase mb-12"
            style={{ color: textColor }}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {businessName}
          </motion.h2>
        ) : null}

        {/* Time */}
        <motion.div
          className="mb-16"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="text-5xl md:text-7xl font-extralight tracking-tight"
            style={{ color: textColor }}
          >
            {formatTime(currentTime)}
          </motion.div>
          <motion.div 
            className="text-lg md:text-xl mt-2 font-light tracking-wide"
            style={{ color: `${textColor}90` }}
          >
            {formatDate(currentTime)}
          </motion.div>
        </motion.div>

        {/* Welcome message */}
        <motion.div
          className="mb-20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 
            className="text-3xl md:text-5xl font-medium mb-4 tracking-tight"
            style={{ color: textColor }}
          >
            {welcomeTitle}
          </h1>
          {welcomeSubtitle && (
            <p 
              className="text-xl md:text-2xl font-light"
              style={{ color: `${textColor}80` }}
            >
              {welcomeSubtitle}
            </p>
          )}
        </motion.div>

        {/* Tap to check in - Glass button with optional glow */}
        <motion.div
          className="relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {enableGlowEffects && (
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ backgroundColor: accentColor }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          <motion.div
            className="relative px-14 py-7 rounded-full backdrop-blur-md"
            style={{ 
              backgroundColor: `${accentColor}15`,
              border: `1.5px solid ${accentColor}40`,
            }}
            whileHover={{ 
              backgroundColor: `${accentColor}25`,
              scale: 1.01,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span 
              className="text-2xl md:text-3xl font-medium"
              style={{ color: textColor }}
            >
              Tap anywhere to check in
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Badge Zone - part of flex flow */}
      {badgeAtBottom && (
        <div className="relative z-20 pb-20">
          <KioskLocationBadge
            locationName={locationName!}
            position={badgePosition}
            style={badgeStyle}
            textColor={textColor}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Bottom pulse indicator - adjusted position based on badge */}
      <motion.div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 flex gap-2 z-10",
          badgeAtBottom ? "bottom-8" : "bottom-12"
        )}
      >
        {[0, 1, 2].map((i) => (
          enableGlowEffects ? (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentColor }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          ) : (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: accentColor,
                opacity: 0.5,
              }}
            />
          )
        ))}
      </motion.div>
    </motion.div>
  );
}

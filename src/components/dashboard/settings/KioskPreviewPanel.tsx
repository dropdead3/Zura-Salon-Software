import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/colorUtils';
import { ChevronLeft, ChevronRight, Phone, Check, AlertCircle, MapPin, Film } from 'lucide-react';

interface BusinessSettings {
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  business_name?: string | null;
}

interface KioskPreviewSettings {
  background_color: string;
  accent_color: string;
  text_color: string;
  welcome_title: string;
  display_orientation: 'portrait' | 'landscape';
  welcome_subtitle: string | null;
  button_style: 'rounded' | 'pill' | 'square';
  logo_url: string | null;
  logo_color: string | null;
  theme_mode: 'dark' | 'light' | 'auto';
  logo_size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  check_in_prompt?: string;
  success_message?: string;
  enable_glow_effects?: boolean;
  background_image_url?: string | null;
  idle_video_url?: string | null;
  background_overlay_opacity?: number;
  show_location_badge?: boolean;
  location_badge_position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  location_badge_style?: 'glass' | 'solid' | 'outline';
}

interface KioskPreviewPanelProps {
  settings: KioskPreviewSettings;
  businessSettings?: BusinessSettings | null;
  className?: string;
  locationName?: string;
}

type PreviewScreen = 'idle' | 'lookup' | 'confirm' | 'success';

const SCREENS: { key: PreviewScreen; label: string }[] = [
  { key: 'idle', label: 'Welcome' },
  { key: 'lookup', label: 'Phone Entry' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'success', label: 'Success' },
];

export function KioskPreviewPanel({ settings, businessSettings, className, locationName }: KioskPreviewPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>('idle');
  const [screenIndex, setScreenIndex] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Determine if we're in dark mode based on theme_mode and background color
  const isDarkMode = settings.theme_mode === 'dark' || 
    (settings.theme_mode === 'auto' && isColorDark(settings.background_color)) ||
    (settings.theme_mode === 'light' ? false : isColorDark(settings.background_color));
  
  // Logo selection logic (same as KioskIdleScreen)
  const logoUrl = settings.logo_url 
    || (isDarkMode ? businessSettings?.logo_light_url : businessSettings?.logo_dark_url)
    || null;
  
  const businessName = businessSettings?.business_name;

  const buttonRadiusClass = {
    rounded: 'rounded-xl',
    pill: 'rounded-full',
    square: 'rounded-md',
  }[settings.button_style];

  // Logo size classes for preview (scaled down from actual)
  const logoSizeClass = {
    xs: 'h-5 max-w-[80px]',
    sm: 'h-6 max-w-[100px]',
    md: 'h-8 max-w-[120px]',
    lg: 'h-10 max-w-[140px]',
    xl: 'h-12 max-w-[160px]',
  }[settings.logo_size];

  const handlePrevScreen = () => {
    const newIndex = (screenIndex - 1 + SCREENS.length) % SCREENS.length;
    setScreenIndex(newIndex);
    setActiveScreen(SCREENS[newIndex].key);
  };

  const handleNextScreen = () => {
    const newIndex = (screenIndex + 1) % SCREENS.length;
    setScreenIndex(newIndex);
    setActiveScreen(SCREENS[newIndex].key);
  };

  const renderLogo = () => {
    if (logoUrl) {
      return (
        <div className="relative mb-4">
          <motion.img 
            src={logoUrl} 
            alt={businessName || 'Logo'} 
            className={`${logoSizeClass} w-auto object-contain`}
            style={{
              filter: isDarkMode 
                ? 'drop-shadow(0 1px 4px rgba(255,255,255,0.1))' 
                : 'drop-shadow(0 1px 4px rgba(0,0,0,0.1))',
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Color overlay for logo */}
          {settings.logo_color && (
            <motion.div 
              className="absolute inset-0 mix-blend-multiply pointer-events-none"
              style={{ 
                backgroundColor: settings.logo_color,
                maskImage: `url(${logoUrl})`,
                WebkitMaskImage: `url(${logoUrl})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      );
    } else if (businessName) {
      return (
        <motion.p
          className="text-xs font-light tracking-widest uppercase mb-4"
          style={{ color: settings.text_color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
        >
          {businessName}
        </motion.p>
      );
    }
    return null;
  };

  // Determine if bottom-center badge is active for responsive spacing
  const hasBottomCenterBadge = settings.show_location_badge && 
    settings.location_badge_position === 'bottom-center';

  // Badge position classes - center positions have extra clearance
  const badgePositionClasses = {
    'top-left': 'top-3 left-3',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-center': 'bottom-10 left-1/2 -translate-x-1/2', // Above indicators
    'bottom-right': 'bottom-3 right-3',
  };

  // Badge styles
  const getBadgeStyle = (style: 'glass' | 'solid' | 'outline') => {
    switch (style) {
      case 'solid':
        return {
          backgroundColor: settings.accent_color,
          color: settings.text_color,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          border: `1px solid ${settings.text_color}30`,
          color: settings.text_color,
        };
      case 'glass':
      default:
        return {
          backgroundColor: `${settings.text_color}10`,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${settings.text_color}15`,
          color: settings.text_color,
        };
    }
  };

  // Render location badge for preview
  const renderLocationBadge = () => {
    if (!settings.show_location_badge) return null;
    const position = settings.location_badge_position || 'bottom-left';
    const style = settings.location_badge_style || 'glass';
    const displayName = locationName || 'Location Name';
    
    return (
      <div
        className={cn(
          "absolute z-10 px-2 py-1 rounded-lg flex items-center gap-1",
          badgePositionClasses[position]
        )}
        style={getBadgeStyle(style)}
      >
        <MapPin className="w-2.5 h-2.5" />
        <span className="text-[8px] font-medium">{displayName}</span>
      </div>
    );
  };

  // Render background media
  const renderBackgroundMedia = () => {
    const hasVideo = settings.idle_video_url;
    const hasImage = settings.background_image_url;
    const overlayOpacity = settings.background_overlay_opacity ?? 0.5;

    if (!hasVideo && !hasImage) return null;

    return (
      <>
        {hasVideo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Film className="w-6 h-6 text-white/50" />
          </div>
        ) : hasImage ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${hasImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      </>
    );
  };

  const renderIdleScreen = () => (
    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center -mt-4">
      {/* Background media */}
      {renderBackgroundMedia()}
      
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col items-center">
        {renderLogo()}
        
        {/* Time display */}
        <motion.div 
          className="text-2xl font-extralight tracking-tight mb-1"
          style={{ color: settings.text_color }}
        >
          {formatTime(currentTime)}
        </motion.div>
        <motion.div 
          className="text-[10px] font-light tracking-wide mb-6"
          style={{ color: `${settings.text_color}90` }}
        >
          {formatDate(currentTime)}
        </motion.div>
        
        {/* Welcome text */}
        <h1 
          style={{ color: settings.text_color }} 
          className="text-base font-medium mb-1 tracking-tight"
        >
          {settings.welcome_title || 'Welcome'}
        </h1>
        
        {settings.welcome_subtitle && (
          <p 
            style={{ color: settings.text_color }} 
            className="text-[10px] opacity-70 mb-6 font-light"
          >
            {settings.welcome_subtitle}
          </p>
        )}
        
        {/* Tap to check in - with optional glow */}
        <div className="relative mt-2">
          {settings.enable_glow_effects && (
            <motion.div
              className="absolute inset-0 rounded-full blur-md"
              style={{ backgroundColor: settings.accent_color }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          <div 
            className={cn("relative px-4 py-2 backdrop-blur-md", buttonRadiusClass)}
            style={{ 
              backgroundColor: `${settings.accent_color}15`,
              border: `1.5px solid ${settings.accent_color}40`,
            }}
          >
            <span 
              className="text-[10px] font-medium" 
              style={{ color: settings.text_color }}
            >
              Tap to check in
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom indicators - shifts down when bottom-center badge is active */}
      <div className={cn(
        "absolute flex gap-1.5 z-10",
        hasBottomCenterBadge ? "bottom-2" : "bottom-4"
      )}>
        {[0, 1, 2].map((i) => (
          settings.enable_glow_effects ? (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: settings.accent_color }}
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
              className="w-1 h-1 rounded-full"
              style={{ 
                backgroundColor: settings.accent_color,
                opacity: 0.5,
              }}
            />
          )
        ))}
      </div>
    </div>
  );

  const renderLookupScreen = () => (
    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center">
      {/* Phone icon */}
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
        style={{ 
          backgroundColor: `${settings.accent_color}20`,
          border: `1px solid ${settings.accent_color}40`,
        }}
      >
        <Phone className="w-5 h-5" style={{ color: settings.accent_color }} />
      </div>
      
      {/* Prompt */}
      <h1 
        style={{ color: settings.text_color }} 
        className="text-sm font-medium mb-4 tracking-tight px-2"
      >
        {settings.check_in_prompt || 'Please enter your phone number'}
      </h1>
      
      {/* Phone display mockup */}
      <div 
        className="px-4 py-2 rounded-xl min-w-[120px] text-center mb-4"
        style={{ 
          backgroundColor: `${settings.text_color}05`,
          border: `1px solid ${settings.accent_color}`,
        }}
      >
        <span 
          className="text-lg font-light tracking-widest"
          style={{ color: settings.text_color }}
        >
          (555) 123-____
        </span>
      </div>
      
      {/* Number pad preview */}
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0, '→'].map((key, i) => (
          <div 
            key={i}
            className={cn(
              "w-8 h-6 flex items-center justify-center rounded-md text-[10px] font-medium",
              key === '→' ? 'col-span-1' : ''
            )}
            style={{ 
              backgroundColor: key === '→' ? `${settings.accent_color}30` : `${settings.text_color}10`,
              color: key === '→' ? settings.accent_color : settings.text_color,
            }}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfirmScreen = () => (
    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center">
      {renderLogo()}
      
      <h1 
        style={{ color: settings.text_color }} 
        className="text-sm font-medium mb-2 tracking-tight"
      >
        Confirm Check-In
      </h1>
      
      {/* Appointment preview */}
      <div 
        className="w-full max-w-[200px] rounded-xl p-3 mb-4"
        style={{ 
          backgroundColor: `${settings.text_color}05`,
          border: `1px solid ${settings.text_color}15`,
        }}
      >
        <p 
          className="text-xs font-medium mb-1"
          style={{ color: settings.text_color }}
        >
          Sarah Johnson
        </p>
        <p 
          className="text-[10px] opacity-70 mb-2"
          style={{ color: settings.text_color }}
        >
          Haircut & Color
        </p>
        <p 
          className="text-[10px]"
          style={{ color: settings.accent_color }}
        >
          2:30 PM with Alex
        </p>
      </div>
      
      {/* Confirm button */}
      <div 
        className={cn("px-6 py-2", buttonRadiusClass)}
        style={{ 
          backgroundColor: settings.accent_color,
          color: isDarkMode ? '#000' : '#fff',
        }}
      >
        <span className="text-xs font-medium">Confirm Check-In</span>
      </div>
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center">
      {/* Success checkmark */}
      <motion.div 
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ 
          backgroundColor: `${settings.accent_color}20`,
          border: `2px solid ${settings.accent_color}`,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <Check className="w-7 h-7" style={{ color: settings.accent_color }} />
      </motion.div>
      
      <h1 
        style={{ color: settings.text_color }} 
        className="text-base font-medium mb-2 tracking-tight"
      >
        You're Checked In!
      </h1>
      
      <p 
        style={{ color: settings.text_color }} 
        className="text-[10px] opacity-70 px-4 leading-relaxed"
      >
        {settings.success_message || 'Your stylist has been notified and will be with you shortly.'}
      </p>
      
      {/* Auto-return indicator */}
      <motion.div 
        className="absolute bottom-4 flex items-center gap-1"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div 
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: settings.accent_color }}
        />
        <span 
          className="text-[8px] opacity-60"
          style={{ color: settings.text_color }}
        >
          Returning to home...
        </span>
      </motion.div>
    </div>
  );

  const renderScreen = () => {
    switch (activeScreen) {
      case 'idle':
        return renderIdleScreen();
      case 'lookup':
        return renderLookupScreen();
      case 'confirm':
        return renderConfirmScreen();
      case 'success':
        return renderSuccessScreen();
      default:
        return renderIdleScreen();
    }
  };

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader>
        <CardTitle className="font-display text-lg">LIVE PREVIEW</CardTitle>
        <CardDescription>See how your kiosk will appear on devices</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Screen Step Toggle */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevScreen}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            {SCREENS.map((screen, idx) => (
              <button
                key={screen.key}
                onClick={() => {
                  setScreenIndex(idx);
                  setActiveScreen(screen.key);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  activeScreen === screen.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {screen.label}
              </button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextScreen}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tablet frame mockup */}
        <div className={cn(
          "relative mx-auto w-full",
          settings.display_orientation === 'landscape' ? "max-w-full" : "max-w-[75%]"
        )}>
          {/* Device frame */}
          <div className="rounded-[2rem] border-[8px] border-slate-800 bg-slate-800 p-1 shadow-xl">
            {/* Screen - matching actual kiosk structure */}
            <div 
              className={cn(
                "rounded-[1.5rem] overflow-hidden relative",
                settings.display_orientation === 'landscape' ? "aspect-[4/3]" : "aspect-[3/4]"
              )}
              style={{ backgroundColor: settings.background_color }}
            >
              {/* Screen content */}
              {renderScreen()}
              
              {/* Location badge - rendered at container level for proper positioning */}
              {renderLocationBadge()}
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Mode indicator */}
        <div className="mt-8 text-center">
          <span className="text-xs text-muted-foreground">
            Mode: <span className="font-medium capitalize">{settings.theme_mode}</span>
            {settings.theme_mode === 'auto' && (
              <span className="ml-1 opacity-70">
                (currently {isDarkMode ? 'dark' : 'light'})
              </span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

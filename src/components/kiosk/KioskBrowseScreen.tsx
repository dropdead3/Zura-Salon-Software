import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Calendar, Phone } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { parse } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

// Privacy-safe name formatting: "John S."
const formatPrivacyName = (fullName: string | null | undefined): string => {
  if (!fullName) return 'Guest';
  const parts = fullName.trim().split(' ');
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] + '.' : '';
  return `${firstName} ${lastInitial}`.trim();
};

// Group appointments by 15-minute time slots
const groupByTimeSlot = (appointments: any[]) => {
  const groups: Record<string, any[]> = {};
  
  appointments.forEach(apt => {
    // Round to nearest 15 minutes for grouping
    const [hours, minutes] = apt.start_time.split(':').map(Number);
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    const slotKey = `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
    
    if (!groups[slotKey]) {
      groups[slotKey] = [];
    }
    groups[slotKey].push(apt);
  });
  
  // Sort by time slot
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

export function KioskBrowseScreen() {
  const { formatDate } = useFormatDate();
  const { 
    settings, 
    session, 
    resetToIdle,
    selectAppointment,
    idleTimeRemaining,
    locationName,
  } = useKiosk();

  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const backgroundOverlayOpacity = settings?.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity;
  const logoUrl = settings?.logo_url;
  const showStylistPhoto = settings?.show_stylist_photo ?? DEFAULT_KIOSK_SETTINGS.show_stylist_photo;

  // Location badge settings
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;

  // Determine badge position for layout adjustments
  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  const appointments = session?.appointments || [];
  const groupedAppointments = groupByTimeSlot(appointments);

  const formatTimeSlot = (slotKey: string) => {
    try {
      const parsed = parse(slotKey, 'HH:mm', new Date());
      return formatDate(parsed, 'h:mm a');
    } catch {
      return slotKey;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm:ss', new Date());
      return formatDate(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  const handleSelectAppointment = (appointment: any) => {
    selectAppointment(appointment);
  };

  // Go back to lookup screen
  const handleBackToLookup = () => {
    resetToIdle();
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
          onClick={handleBackToLookup}
          whileHover={{ backgroundColor: `${textColor}18` }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg font-medium">Back</span>
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
        "relative z-10 flex-1 flex flex-col items-center px-8 overflow-auto",
        badgeAtBottom && "pb-20"
      )}>
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div 
            className="relative w-20 h-20 mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <div 
              className="relative w-full h-full rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ 
                backgroundColor: `${accentColor}15`,
                border: `1.5px solid ${accentColor}40`,
              }}
            >
              <Calendar className="w-10 h-10" style={{ color: accentColor }} />
            </div>
          </motion.div>
          
          <h1 
            className="text-3xl md:text-4xl font-medium tracking-tight mb-2"
            style={{ color: textColor }}
          >
            Find Your Appointment
          </h1>
          <p 
            className="text-lg md:text-xl opacity-70"
            style={{ color: textColor }}
          >
            Select your name from the list below
          </p>
        </motion.div>

        {appointments.length > 0 ? (
          <div className="w-full max-w-2xl space-y-6 pb-8">
            {groupedAppointments.map(([slotKey, slotAppointments], groupIndex) => (
              <motion.div
                key={slotKey}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: groupIndex * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              >
                {/* Time slot header */}
                <div 
                  className="flex items-center gap-3 mb-3 px-2"
                  style={{ color: `${textColor}70` }}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-lg font-medium">{formatTimeSlot(slotKey)}</span>
                </div>

                {/* Appointments in this slot */}
                <div className="space-y-3">
                  {slotAppointments.map((appointment, index) => (
                    <motion.button
                      key={appointment.id}
                      className="w-full p-5 rounded-2xl text-left backdrop-blur-md transition-all"
                      style={{
                        backgroundColor: `${textColor}08`,
                        border: `1.5px solid ${textColor}20`,
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                      whileHover={{ 
                        scale: 1.01,
                        borderColor: `${accentColor}50`,
                        backgroundColor: `${textColor}12`,
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectAppointment(appointment)}
                    >
                      <div className="flex items-center gap-5">
                        {/* Stylist photo */}
                        {showStylistPhoto && (
                          <div 
                            className="relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 backdrop-blur-md"
                            style={{ 
                              backgroundColor: `${accentColor}15`,
                              border: `1.5px solid ${accentColor}30`,
                            }}
                          >
                            {appointment.stylist_photo ? (
                              <img 
                                src={appointment.stylist_photo} 
                                alt={appointment.stylist_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-8 h-8" style={{ color: accentColor }} />
                            )}
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-xl font-medium mb-1 truncate"
                            style={{ color: textColor }}
                          >
                            {formatPrivacyName(appointment.client_name)}
                          </div>
                          
                          <div 
                            className="text-base opacity-80"
                            style={{ color: textColor }}
                          >
                            {appointment.service_name || 'Appointment'}
                            {appointment.stylist_name && (
                              <span className="opacity-70"> • with {appointment.stylist_name}</span>
                            )}
                          </div>
                        </div>

                        {/* Time badge */}
                        <motion.div 
                          className="px-4 py-2 rounded-xl text-base font-medium backdrop-blur-md flex-shrink-0"
                          style={{
                            backgroundColor: `${accentColor}15`,
                            border: `1.5px solid ${accentColor}40`,
                            color: textColor,
                          }}
                        >
                          {formatTime(appointment.start_time)}
                        </motion.div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* No appointments in time window */
          <motion.div
            className="text-center max-w-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <p 
              className="text-xl mb-8"
              style={{ color: `${textColor}90` }}
            >
              No appointments found in the current time window. Please try checking in with your phone number.
            </p>
          </motion.div>
        )}

        {/* Bottom action */}
        <motion.div 
          className="mt-8 pb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-lg font-medium backdrop-blur-md transition-all"
            style={{ 
              backgroundColor: `${textColor}10`,
              border: `1.5px solid ${textColor}20`,
              color: textColor,
            }}
            onClick={handleBackToLookup}
            whileHover={{ 
              backgroundColor: `${textColor}18`,
              scale: 1.02,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Phone className="w-5 h-5" />
            Not listed? Try phone lookup
          </motion.button>
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

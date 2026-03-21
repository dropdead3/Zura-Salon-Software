import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, MessageSquare, ArrowLeft, Bell, CheckCircle, Loader2, Clock, User } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { supabase } from '@/integrations/supabase/client';
import { parse } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function KioskWrongLocationScreen() {
  const { formatDate } = useFormatDate();
  const { 
    settings, 
    session, 
    resetToIdle,
    organizationId,
    locationId,
    idleTimeRemaining,
    locationName,
  } = useKiosk();

  const [isNotifying, setIsNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const logoUrl = settings?.logo_url;

  // Location badge settings
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;

  // Determine badge position for layout adjustments
  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  const wrongLocationAppointments = session?.wrongLocationAppointments || [];
  const appointment = wrongLocationAppointments[0]; // Show first wrong-location appointment

  const formatTime = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, 'HH:mm:ss', new Date());
      return formatDate(parsed, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  const handleNotifyProvider = async () => {
    if (!appointment || isNotifying || notified) return;

    setIsNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('kiosk-wrong-location-notify', {
        body: {
          appointment_id: appointment.id,
          stylist_user_id: appointment.stylist_user_id,
          client_name: session?.client?.name || appointment.client_name || 'Client',
          service_name: appointment.service_name || 'Appointment',
          scheduled_time: formatTime(appointment.start_time),
          scheduled_location_id: appointment.location_id,
          arrived_location_id: locationId,
          organization_id: organizationId,
        },
      });

      if (error) throw error;

      setNotified(true);
      toast.success(`${appointment.stylist_name || 'Your provider'} has been notified!`);
    } catch (error) {
      console.error('Failed to notify provider:', error);
      toast.error('Unable to send notification. Please call or text your provider directly.');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleCall = () => {
    if (appointment?.stylist_phone) {
      window.location.href = `tel:${appointment.stylist_phone}`;
    }
  };

  const handleText = () => {
    if (appointment?.stylist_phone) {
      window.location.href = `sms:${appointment.stylist_phone}`;
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
      {/* Overlay */}
      {backgroundImageUrl && (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Warning ambient glow */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center top, #F59E0B40 0%, transparent 50%)`,
        }}
      />

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
            backgroundColor: `${textColor}08`,
            border: `1px solid ${textColor}15`,
            color: textColor,
          }}
          onClick={resetToIdle}
          whileHover={{ backgroundColor: `${textColor}15` }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg font-medium">Start Over</span>
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
              backgroundColor: `${accentColor}20`,
              border: `1px solid ${accentColor}30`,
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
        "relative z-10 flex-1 flex flex-col items-center justify-center px-8 overflow-auto",
        badgeAtBottom && "pb-20"
      )}>
        <motion.div
          className="text-center max-w-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Warning icon */}
          <motion.div
            className="relative mb-8 mx-auto w-28 h-28"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            {/* Pulsing rings */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid #F59E0B` }}
              animate={{
                scale: [1, 1.3, 1.3],
                opacity: [0.6, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid #F59E0B` }}
              animate={{
                scale: [1, 1.2, 1.2],
                opacity: [0.4, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.3,
              }}
            />
            {/* Icon container */}
            <div 
              className="absolute inset-0 rounded-full flex items-center justify-center backdrop-blur-sm"
              style={{ 
                backgroundColor: `#F59E0B15`,
                border: `2px solid #F59E0B40`,
              }}
            >
              <MapPin 
                className="w-14 h-14"
                style={{ color: '#F59E0B' }}
              />
            </div>
          </motion.div>

          {/* Message */}
          <motion.h1 
            className="text-3xl md:text-4xl font-medium mb-4 tracking-tight"
            style={{ color: textColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Wrong Location
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl mb-8 leading-relaxed"
            style={{ color: `${textColor}90` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Your appointment is scheduled at a different location.
            <br />
            Please speak with the front desk for assistance.
          </motion.p>

          {/* Appointment card */}
          {appointment && (
            <motion.div
              className="w-full p-6 rounded-3xl text-left backdrop-blur-md mb-8"
              style={{
                backgroundColor: `${textColor}08`,
                border: `2px solid #F59E0B30`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start gap-4">
                {/* Stylist photo */}
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ 
                    backgroundColor: `${accentColor}20`,
                    border: `2px solid ${accentColor}30`,
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

                {/* Appointment details */}
                <div className="flex-1">
                  <div 
                    className="text-xl font-medium mb-1"
                    style={{ color: textColor }}
                  >
                    {appointment.service_name || 'Your Appointment'}
                  </div>
                  <div 
                    className="flex items-center gap-2 mb-2"
                    style={{ color: `${textColor}80` }}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(appointment.start_time)}</span>
                    {appointment.stylist_name && (
                      <>
                        <span>•</span>
                        <span>with {appointment.stylist_name}</span>
                      </>
                    )}
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg inline-flex"
                    style={{ 
                      backgroundColor: '#F59E0B15',
                      color: '#F59E0B',
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Scheduled at: {appointment.location_name || 'Different Location'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div 
            className="flex flex-col gap-4 items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Notify provider button */}
            {appointment?.stylist_user_id && (
              <motion.button
                className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-xl font-medium min-w-[320px] shadow-xl transition-all disabled:opacity-60"
                style={{
                  background: notified 
                    ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                    : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                  color: '#FFFFFF',
                  boxShadow: notified 
                    ? '0 8px 32px rgba(34, 197, 94, 0.4)'
                    : `0 8px 32px ${accentColor}40`,
                }}
                onClick={handleNotifyProvider}
                disabled={isNotifying || notified}
                whileHover={!notified ? { 
                  scale: 1.02, 
                  y: -2,
                } : {}}
                whileTap={!notified ? { scale: 0.98 } : {}}
              >
                {isNotifying ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Notifying...
                  </>
                ) : notified ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    {appointment.stylist_name || 'Provider'} Notified!
                  </>
                ) : (
                  <>
                    <Bell className="w-6 h-6" />
                    Notify {appointment.stylist_name || 'My Provider'}
                  </>
                )}
              </motion.button>
            )}

            {/* Contact options */}
            {appointment?.stylist_phone && (
              <div className="flex gap-4">
                <motion.button
                  className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-lg backdrop-blur-md transition-all"
                  style={{ 
                    backgroundColor: `${textColor}08`,
                    border: `1px solid ${textColor}15`,
                    color: textColor,
                  }}
                  onClick={handleCall}
                  whileHover={{ backgroundColor: `${textColor}15`, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-5 h-5" />
                  Call
                </motion.button>
                <motion.button
                  className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-lg backdrop-blur-md transition-all"
                  style={{ 
                    backgroundColor: `${textColor}08`,
                    border: `1px solid ${textColor}15`,
                    color: textColor,
                  }}
                  onClick={handleText}
                  whileHover={{ backgroundColor: `${textColor}15`, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageSquare className="w-5 h-5" />
                  Text
                </motion.button>
              </div>
            )}

            {/* Info text */}
            <motion.p
              className="text-sm mt-4 max-w-md"
              style={{ color: `${textColor}60` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {notified 
                ? 'Your provider will reach out shortly. They can advise if you should travel to the correct location or if rescheduling is needed.'
                : 'If no receptionist is available, tap the button above to notify your provider. They can help determine if you can still make your appointment.'}
            </motion.p>

            {/* Start over button */}
            <motion.button
              className="mt-4 px-8 py-4 rounded-xl text-lg font-medium backdrop-blur-md transition-all"
              style={{ 
                backgroundColor: `${textColor}08`,
                border: `1px solid ${textColor}15`,
                color: textColor,
              }}
              onClick={resetToIdle}
              whileHover={{ backgroundColor: `${textColor}15`, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Over
            </motion.button>
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

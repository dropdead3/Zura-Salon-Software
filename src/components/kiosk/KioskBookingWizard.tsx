import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, User, Check, Calendar, Scissors, Phone, ChevronRight, Loader2 } from 'lucide-react';
import { useKiosk } from './KioskProvider';
import { DEFAULT_KIOSK_SETTINGS } from '@/hooks/useKioskSettings';
import { KioskLocationBadge, isBadgeAtTop, isBadgeAtBottom } from './KioskLocationBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isSunday } from 'date-fns';
import { cn } from '@/lib/utils';

type BookingStep = 'services' | 'stylist' | 'datetime' | 'info' | 'confirm';

interface SelectedService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string;
}

interface SelectedStylist {
  id: string;
  phorest_staff_id: string;
  name: string;
  photo_url: string | null;
}

export function KioskBookingWizard() {
  const { 
    settings, 
    resetToIdle, 
    locationId,
    organizationId,
    locationName,
    session,
    idleTimeRemaining,
  } = useKiosk();

  const backgroundColor = settings?.background_color || DEFAULT_KIOSK_SETTINGS.background_color;
  const textColor = settings?.text_color || DEFAULT_KIOSK_SETTINGS.text_color;
  const accentColor = settings?.accent_color || DEFAULT_KIOSK_SETTINGS.accent_color;
  const backgroundImageUrl = settings?.background_image_url;
  const backgroundOverlayOpacity = settings?.background_overlay_opacity ?? DEFAULT_KIOSK_SETTINGS.background_overlay_opacity;
  const logoUrl = settings?.logo_url;
  const showLocationBadge = settings?.show_location_badge ?? DEFAULT_KIOSK_SETTINGS.show_location_badge;
  const badgePosition = settings?.location_badge_position ?? DEFAULT_KIOSK_SETTINGS.location_badge_position;
  const badgeStyle = settings?.location_badge_style ?? DEFAULT_KIOSK_SETTINGS.location_badge_style;
  const allowFuture = settings?.self_booking_allow_future ?? false;
  const showStylists = settings?.self_booking_show_stylists ?? true;

  const hasBadge = showLocationBadge && !!locationName;
  const badgeAtTop = hasBadge && isBadgeAtTop(badgePosition);
  const badgeAtBottom = hasBadge && isBadgeAtBottom(badgePosition);

  // Wizard state
  const [step, setStep] = useState<BookingStep>('services');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<SelectedStylist | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [phoneInputActive, setPhoneInputActive] = useState(false);

  // Fetch location's branch_id
  const { data: locationData } = useQuery({
    queryKey: ['kiosk-location-branch', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('phorest_branch_id')
        .eq('id', locationId)
        .single();
      return data;
    },
  });

  const branchId = locationData?.phorest_branch_id;

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['kiosk-booking-services', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('phorest_services')
        .select('id, phorest_service_id, name, duration_minutes, price, category')
        .eq('phorest_branch_id', branchId)
        .eq('is_active', true)
        .order('category')
        .order('name');
      return data || [];
    },
    enabled: !!branchId,
  });

  // Get unique categories
  const categories = [...new Set(services.map(s => s.category).filter(Boolean))];

  // Fetch stylists
  const { data: stylists = [] } = useQuery({
    queryKey: ['kiosk-booking-stylists', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('phorest_staff_mapping')
        .select(`
          id,
          phorest_staff_id,
          user_id,
          employee:employee_profiles!phorest_staff_mapping_user_id_fkey(
            display_name,
            photo_url
          )
        `)
        .eq('phorest_branch_id', branchId)
        .eq('show_on_calendar', true);
      return (data || []).map(s => ({
        id: s.id,
        phorest_staff_id: s.phorest_staff_id,
        name: (s.employee as any)?.display_name || 'Staff',
        photo_url: (s.employee as any)?.photo_url || null,
      }));
    },
    enabled: !!branchId && showStylists,
  });

  // Generate available dates
  const availableDates = (() => {
    const dates: Date[] = [];
    const maxDays = allowFuture ? 14 : 1;
    for (let i = 0; i < maxDays; i++) {
      const d = addDays(new Date(), i);
      if (!isSunday(d)) dates.push(d);
    }
    return dates;
  })();

  // Generate time slots (30-min intervals, 9am-8pm)
  const timeSlots = (() => {
    const slots: string[] = [];
    const now = new Date();
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    
    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (isToday) {
          const slotMinutes = h * 60 + m;
          const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30; // 30min buffer
          if (slotMinutes < currentMinutes) continue;
        }
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  })();

  // Determine steps based on settings
  const getSteps = (): BookingStep[] => {
    const steps: BookingStep[] = ['services'];
    if (showStylists) steps.push('stylist');
    steps.push('datetime', 'info', 'confirm');
    return steps;
  };

  const steps = getSteps();
  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) setStep(steps[nextIndex]);
  };

  const handleBack = () => {
    if (step === 'services' && selectedCategory) {
      setSelectedCategory(null);
      return;
    }
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(steps[prevIndex]);
    else resetToIdle();
  };

  const canProceed = () => {
    switch (step) {
      case 'services': return selectedServices.length > 0;
      case 'stylist': return true; // "First Available" is always valid
      case 'datetime': return !!selectedTime;
      case 'info': return clientName.trim().length > 0 && clientPhone.replace(/\D/g, '').length >= 7;
      case 'confirm': return true;
      default: return false;
    }
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  const handleBook = async () => {
    if (isBooking) return;
    setIsBooking(true);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startTime = `${selectedTime}:00`;
      const endMinutes = (parseInt(selectedTime!.split(':')[0]) * 60 + parseInt(selectedTime!.split(':')[1])) + totalDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;

      // Insert into phorest_appointments
      const { error } = await supabase
        .from('phorest_appointments')
        .insert({
          phorest_id: `kiosk-walkin-${crypto.randomUUID().slice(0, 8)}`,
          phorest_branch_id: branchId,
          appointment_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          service_name: selectedServices.map(s => s.name).join(', '),
          client_name: clientName.trim(),
          status: 'checked_in',
          location_id: locationId,
          stylist_user_id: selectedStylist ? undefined : undefined,
          phorest_staff_id: selectedStylist?.phorest_staff_id || null,
          duration_minutes: totalDuration,
        });

      if (error) throw error;

      // Log analytics
      await supabase.from('kiosk_analytics').insert({
        organization_id: organizationId,
        location_id: locationId,
        session_id: session?.sessionId,
        session_started_at: session?.startedAt.toISOString(),
        session_ended_at: new Date().toISOString(),
        session_completed: true,
        check_in_method: 'self_booking',
        is_walk_in: true,
        total_duration_seconds: session ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000) : 0,
      });

      // Transition to success via parent
      resetToIdle(); // For now, reset -- could add a success state
    } catch (err) {
      console.error('Booking failed:', err);
      setIsBooking(false);
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Number pad for phone
  const handlePhoneDigit = (digit: string) => {
    if (clientPhone.length < 12) {
      setClientPhone(prev => prev + digit);
    }
  };

  const handlePhoneDelete = () => {
    setClientPhone(prev => prev.slice(0, -1));
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
      {backgroundImageUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOverlayOpacity})` }} />
      )}

      {badgeAtTop && (
        <div className="relative z-20 pt-6">
          <KioskLocationBadge locationName={locationName!} position={badgePosition} style={badgeStyle} textColor={textColor} accentColor={accentColor} />
        </div>
      )}

      {/* Header */}
      <div className={cn("relative z-10 flex items-center justify-between p-6", badgeAtTop && "pt-4")}>
        <motion.button
          className="flex items-center gap-2 px-5 py-3 rounded-2xl backdrop-blur-md transition-all"
          style={{ backgroundColor: `${textColor}10`, border: `1.5px solid ${textColor}20`, color: textColor }}
          onClick={handleBack}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg font-medium">Back</span>
        </motion.button>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: i <= currentStepIndex ? accentColor : `${textColor}20`,
                transform: i === currentStepIndex ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 object-contain" />}

        {idleTimeRemaining > 0 && idleTimeRemaining < 30 && (
          <motion.div
            className="px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-md"
            style={{ backgroundColor: `${accentColor}15`, border: `1.5px solid ${accentColor}30`, color: accentColor }}
          >
            {idleTimeRemaining}s
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className={cn("relative z-10 flex-1 flex flex-col px-8 overflow-auto", badgeAtBottom && "pb-20")}>
        <AnimatePresence mode="wait">
          {/* STEP: Services */}
          {step === 'services' && (
            <motion.div key="services" className="flex-1 flex flex-col" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-3xl font-medium mb-2 tracking-tight" style={{ color: textColor }}>
                {selectedCategory ? selectedCategory : 'Select a Service'}
              </h2>
              <p className="text-lg mb-6" style={{ color: `${textColor}70` }}>
                {selectedCategory ? 'Choose your services' : 'Pick a category to get started'}
              </p>

              {!selectedCategory ? (
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat}
                      className="p-6 rounded-3xl text-left backdrop-blur-md transition-all"
                      style={{ backgroundColor: `${textColor}08`, border: `1.5px solid ${textColor}20` }}
                      onClick={() => setSelectedCategory(cat)}
                      whileHover={{ scale: 1.02, borderColor: `${accentColor}50` }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Scissors className="w-8 h-8 mb-3" style={{ color: accentColor }} />
                      <span className="text-xl font-medium block" style={{ color: textColor }}>{cat}</span>
                      <span className="text-sm" style={{ color: `${textColor}60` }}>
                        {services.filter(s => s.category === cat).length} services
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl overflow-auto flex-1">
                  {services.filter(s => s.category === selectedCategory).map((service) => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <motion.button
                        key={service.id}
                        className="w-full p-5 rounded-2xl text-left backdrop-blur-md transition-all flex items-center justify-between"
                        style={{
                          backgroundColor: isSelected ? `${accentColor}15` : `${textColor}08`,
                          border: `1.5px solid ${isSelected ? accentColor : `${textColor}20`}`,
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedServices(prev => prev.filter(s => s.id !== service.id));
                          } else {
                            setSelectedServices(prev => [...prev, {
                              id: service.id,
                              name: service.name,
                              duration_minutes: service.duration_minutes || 30,
                              price: service.price || 0,
                              category: service.category || '',
                            }]);
                          }
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div>
                          <span className="text-lg font-medium block" style={{ color: textColor }}>{service.name}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-sm" style={{ color: `${textColor}70` }}>
                              <Clock className="w-4 h-4" /> {service.duration_minutes || 30} min
                            </span>
                            {service.price > 0 && (
                              <span className="text-sm font-medium" style={{ color: accentColor }}>
                                {formatPrice(service.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP: Stylist */}
          {step === 'stylist' && (
            <motion.div key="stylist" className="flex-1 flex flex-col" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-3xl font-medium mb-2 tracking-tight" style={{ color: textColor }}>Choose Your Stylist</h2>
              <p className="text-lg mb-6" style={{ color: `${textColor}70` }}>Select a stylist or let us assign the first available</p>

              <div className="grid grid-cols-2 gap-4 max-w-2xl overflow-auto flex-1">
                {/* First Available option */}
                <motion.button
                  className="p-6 rounded-3xl text-center backdrop-blur-md transition-all"
                  style={{
                    backgroundColor: !selectedStylist ? `${accentColor}15` : `${textColor}08`,
                    border: `1.5px solid ${!selectedStylist ? accentColor : `${textColor}20`}`,
                  }}
                  onClick={() => setSelectedStylist(null)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                    <User className="w-8 h-8" style={{ color: accentColor }} />
                  </div>
                  <span className="text-lg font-medium block" style={{ color: textColor }}>First Available</span>
                  <span className="text-sm" style={{ color: `${textColor}60` }}>Shortest wait time</span>
                </motion.button>

                {stylists.map((stylist) => {
                  const isSelected = selectedStylist?.id === stylist.id;
                  return (
                    <motion.button
                      key={stylist.id}
                      className="p-6 rounded-3xl text-center backdrop-blur-md transition-all"
                      style={{
                        backgroundColor: isSelected ? `${accentColor}15` : `${textColor}08`,
                        border: `1.5px solid ${isSelected ? accentColor : `${textColor}20`}`,
                      }}
                      onClick={() => setSelectedStylist(stylist)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden" style={{ border: `2px solid ${isSelected ? accentColor : `${textColor}20`}` }}>
                        {stylist.photo_url ? (
                          <img src={stylist.photo_url} alt={stylist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                            <User className="w-8 h-8" style={{ color: accentColor }} />
                          </div>
                        )}
                      </div>
                      <span className="text-lg font-medium block" style={{ color: textColor }}>{stylist.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP: Date & Time */}
          {step === 'datetime' && (
            <motion.div key="datetime" className="flex-1 flex flex-col" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-3xl font-medium mb-2 tracking-tight" style={{ color: textColor }}>Pick a Date & Time</h2>
              <p className="text-lg mb-6" style={{ color: `${textColor}70` }}>
                {allowFuture ? 'Select a date in the next 14 days' : 'Choose a time for today'}
              </p>

              {/* Date picker - horizontal scroll */}
              {allowFuture && (
                <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                  {availableDates.map((date) => {
                    const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    return (
                      <motion.button
                        key={date.toISOString()}
                        className="flex-shrink-0 w-20 py-4 rounded-2xl text-center backdrop-blur-md transition-all"
                        style={{
                          backgroundColor: isSelected ? `${accentColor}15` : `${textColor}08`,
                          border: `1.5px solid ${isSelected ? accentColor : `${textColor}20`}`,
                        }}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-xs font-medium" style={{ color: `${textColor}60` }}>{format(date, 'EEE')}</div>
                        <div className="text-2xl font-medium" style={{ color: textColor }}>{format(date, 'd')}</div>
                        <div className="text-xs" style={{ color: `${textColor}60` }}>{format(date, 'MMM')}</div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Time slots grid */}
              <div className="grid grid-cols-4 gap-3 max-w-2xl overflow-auto flex-1">
                {timeSlots.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <motion.button
                      key={time}
                      className="py-4 rounded-2xl text-center backdrop-blur-md transition-all"
                      style={{
                        backgroundColor: isSelected ? `${accentColor}15` : `${textColor}08`,
                        border: `1.5px solid ${isSelected ? accentColor : `${textColor}20`}`,
                      }}
                      onClick={() => setSelectedTime(time)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-lg font-medium" style={{ color: textColor }}>{formatTimeDisplay(time)}</span>
                    </motion.button>
                  );
                })}
                {timeSlots.length === 0 && (
                  <div className="col-span-4 text-center py-12" style={{ color: `${textColor}60` }}>
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No available time slots for this date</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP: Client Info */}
          {step === 'info' && (
            <motion.div key="info" className="flex-1 flex flex-col items-center" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-3xl font-medium mb-2 tracking-tight" style={{ color: textColor }}>Your Information</h2>
              <p className="text-lg mb-8" style={{ color: `${textColor}70` }}>Enter your name and phone number</p>

              <div className="w-full max-w-md space-y-6">
                {/* Name input */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: `${textColor}80` }}>Full Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-6 py-5 rounded-2xl text-xl backdrop-blur-md focus:outline-none transition-all"
                    style={{
                      backgroundColor: `${textColor}08`,
                      border: `1.5px solid ${clientName ? accentColor : `${textColor}20`}`,
                      color: textColor,
                    }}
                    autoFocus
                  />
                </div>

                {/* Phone input */}
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: `${textColor}80` }}>Phone Number</label>
                  <div
                    className="w-full px-6 py-5 rounded-2xl text-xl backdrop-blur-md cursor-text"
                    style={{
                      backgroundColor: `${textColor}08`,
                      border: `1.5px solid ${clientPhone.length >= 7 ? accentColor : `${textColor}20`}`,
                      color: clientPhone ? textColor : `${textColor}40`,
                    }}
                    onClick={() => setPhoneInputActive(true)}
                  >
                    {clientPhone || 'Enter phone number'}
                  </div>
                </div>

                {/* Number pad */}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                    <motion.button
                      key={key || 'empty'}
                      className={cn(
                        "h-16 rounded-2xl text-xl font-medium transition-colors backdrop-blur-md",
                        key === '' && 'invisible',
                      )}
                      style={{
                        backgroundColor: key === 'del' ? `${textColor}05` : `${textColor}10`,
                        border: `1.5px solid ${textColor}15`,
                        color: textColor,
                      }}
                      onClick={() => {
                        if (key === 'del') handlePhoneDelete();
                        else if (key) handlePhoneDigit(key);
                      }}
                      whileTap={{ scale: 0.95 }}
                      disabled={key === ''}
                    >
                      {key === 'del' ? '←' : key}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && (
            <motion.div key="confirm" className="flex-1 flex flex-col items-center justify-center" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-3xl font-medium mb-8 tracking-tight" style={{ color: textColor }}>Review & Confirm</h2>

              <div className="w-full max-w-lg space-y-4">
                {/* Summary card */}
                <div className="rounded-3xl p-6 backdrop-blur-md space-y-4" style={{ backgroundColor: `${textColor}08`, border: `1.5px solid ${textColor}20` }}>
                  {/* Services */}
                  <div className="flex items-start gap-4">
                    <Scissors className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: accentColor }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: `${textColor}60` }}>Services</div>
                      {selectedServices.map(s => (
                        <div key={s.id} className="text-lg" style={{ color: textColor }}>{s.name}</div>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-sm" style={{ color: `${textColor}60` }}>{totalDuration} min</div>
                      {totalPrice > 0 && <div className="text-lg font-medium" style={{ color: accentColor }}>{formatPrice(totalPrice)}</div>}
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: `${textColor}15` }} />

                  {/* Stylist */}
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: `${textColor}60` }}>Stylist</div>
                      <div className="text-lg" style={{ color: textColor }}>{selectedStylist?.name || 'First Available'}</div>
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: `${textColor}15` }} />

                  {/* Date & Time */}
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: `${textColor}60` }}>Date & Time</div>
                      <div className="text-lg" style={{ color: textColor }}>
                        {format(selectedDate, 'EEEE, MMM d')} at {selectedTime ? formatTimeDisplay(selectedTime) : ''}
                      </div>
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: `${textColor}15` }} />

                  {/* Client */}
                  <div className="flex items-center gap-4">
                    <Phone className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: `${textColor}60` }}>Client</div>
                      <div className="text-lg" style={{ color: textColor }}>{clientName}</div>
                      <div className="text-sm" style={{ color: `${textColor}70` }}>{clientPhone}</div>
                    </div>
                  </div>
                </div>

                {/* Book button */}
                <motion.button
                  className="w-full py-6 rounded-2xl text-xl font-medium backdrop-blur-md transition-all flex items-center justify-center gap-3"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    border: `2px solid ${accentColor}`,
                    color: textColor,
                  }}
                  onClick={handleBook}
                  disabled={isBooking}
                  whileHover={{ scale: 1.02, backgroundColor: `${accentColor}30` }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isBooking ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      Book Appointment
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation - only show Next button when not on confirm */}
      {step !== 'confirm' && (
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Selected services summary */}
            {selectedServices.length > 0 && step !== 'services' && (
              <div className="flex items-center gap-2" style={{ color: `${textColor}70` }}>
                <span className="text-sm">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}</span>
                <span className="text-sm">• {totalDuration} min</span>
                {totalPrice > 0 && <span className="text-sm font-medium" style={{ color: accentColor }}>{formatPrice(totalPrice)}</span>}
              </div>
            )}
            <div className="flex-1" />
            <motion.button
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-medium backdrop-blur-md transition-all disabled:opacity-40"
              style={{
                backgroundColor: canProceed() ? `${accentColor}20` : `${textColor}08`,
                border: `1.5px solid ${canProceed() ? accentColor : `${textColor}20`}`,
                color: textColor,
              }}
              onClick={handleNext}
              disabled={!canProceed()}
              whileHover={canProceed() ? { scale: 1.02 } : {}}
              whileTap={canProceed() ? { scale: 0.98 } : {}}
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      )}

      {badgeAtBottom && (
        <div className="relative z-20 pb-8">
          <KioskLocationBadge locationName={locationName!} position={badgePosition} style={badgeStyle} textColor={textColor} accentColor={accentColor} />
        </div>
      )}
    </motion.div>
  );
}

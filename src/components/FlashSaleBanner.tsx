import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface FlashSaleBannerProps {
  promotionId: string;
  promotionName: string;
  discountText: string;
  expiresAt: string;
  bannerText?: string;
  bannerColor?: string;
  bookingUrl?: string;
  onDismiss?: () => void;
  className?: string;
}

export function FlashSaleBanner({
  promotionId,
  promotionName,
  discountText,
  expiresAt,
  bannerText,
  bannerColor = '#ef4444',
  bookingUrl = '/book',
  onDismiss,
  className,
}: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(expiresAt).getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    // Store dismissal in localStorage to persist across page refreshes
    localStorage.setItem(`flash-sale-dismissed-${promotionId}`, 'true');
  };

  // Check if already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(`flash-sale-dismissed-${promotionId}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [promotionId]);

  if (isDismissed || !timeLeft) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative w-full py-3 px-4 text-white overflow-hidden',
        className
      )}
      style={{ backgroundColor: bannerColor }}
    >
      {/* Animated background stripes */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 animate-pulse opacity-20"
          style={{
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.1) 10px,
              rgba(255,255,255,0.1) 20px
            )`
          }}
        />
      </div>

      <div className="relative container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 animate-pulse" />
          <div>
            <p className="font-medium text-sm md:text-base">
              {bannerText || `⚡ FLASH SALE: ${discountText} on ${promotionName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown */}
          <div className="hidden sm:flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4 mr-1" />
            <div className="flex gap-1">
              {timeLeft.days > 0 && (
                <TimeBlock value={timeLeft.days} label="D" />
              )}
              <TimeBlock value={timeLeft.hours} label="H" />
              <TimeBlock value={timeLeft.minutes} label="M" />
              <TimeBlock value={timeLeft.seconds} label="S" />
            </div>
          </div>

          <Button
            size={tokens.button.card}
            variant="secondary"
            className="bg-white text-black hover:bg-gray-100 font-medium"
            asChild
          >
            <a href={bookingUrl}>Book Now</a>
          </Button>

          <Button
            size={tokens.button.inline}
            variant="ghost"
            className="text-white hover:bg-white/20 p-1 h-auto"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center">
      <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-medium">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs ml-0.5 mr-1.5">{label}</span>
    </div>
  );
}

// Hook to fetch and display active flash sales
export function useActiveFlashSales(organizationId: string | undefined) {
  const [flashSale, setFlashSale] = useState<{
    id: string;
    name: string;
    discount_value: number;
    promotion_type: string;
    expires_at: string;
    banner_text: string | null;
    banner_color: string | null;
  } | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    // Fetch active flash sales from promotions table
    const fetchFlashSales = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const now = new Date().toISOString();

      const { data } = await supabase
        .from('promotions' as any)
        .select('id, name, discount_value, promotion_type, expires_at, banner_text, banner_color')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_flash_sale', true)
        .eq('show_homepage_banner', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .maybeSingle();

      if (data) {
        setFlashSale(data as any);
      }
    };

    fetchFlashSales();
  }, [organizationId]);

  return flashSale;
}

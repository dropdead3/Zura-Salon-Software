import { QRCodeSVG } from 'qrcode.react';
import { GiftCardSettings } from '@/hooks/useGiftCardSettings';
import { cn } from '@/lib/utils';

interface GiftCardPreviewProps {
  settings: Partial<GiftCardSettings>;
  amount: number;
  code: string;
  recipientName?: string;
  fromName?: string;
  message?: string;
}

export function GiftCardPreview({ 
  settings, 
  amount, 
  code,
  recipientName,
  fromName,
  message 
}: GiftCardPreviewProps) {
  const bgColor = settings.card_background_color || '#1a1a1a';
  const textColor = settings.card_text_color || '#ffffff';
  const accentColor = settings.card_accent_color || '#d4af37';
  const template = settings.print_template || 'elegant';
  const includeQR = settings.include_qr_code ?? true;
  const includeTerms = settings.include_terms ?? true;

  return (
    <div 
      className={cn(
        "relative w-full aspect-[2/1] rounded-xl overflow-hidden shadow-lg",
        template === 'modern' && "rounded-none",
        template === 'minimal' && "rounded-lg"
      )}
      style={{ backgroundColor: bgColor }}
    >
      {/* Decorative elements based on template */}
      {template === 'elegant' && (
        <>
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
            style={{ backgroundColor: accentColor }}
          />
          <div 
            className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 translate-y-1/2 -translate-x-1/2"
            style={{ backgroundColor: accentColor }}
          />
        </>
      )}

      {template === 'modern' && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p 
              className="text-xs font-display uppercase tracking-widest opacity-70"
              style={{ color: textColor }}
            >
              Gift Card
            </p>
            <p 
              className={cn(
                "font-display font-medium mt-1",
                template === 'elegant' ? "text-2xl" : "text-xl"
              )}
              style={{ color: accentColor }}
            >
              ${amount}
            </p>
          </div>
          
          {includeQR && (
            <div className="bg-white p-1 rounded">
              <QRCodeSVG
                value={`giftcard:${code}`}
                size={48}
                level="M"
              />
            </div>
          )}
        </div>

        {/* Message */}
        {(recipientName || fromName || message) && (
          <div className="my-2 text-sm" style={{ color: textColor }}>
            {recipientName && <p>To: {recipientName}</p>}
            {fromName && <p>From: {fromName}</p>}
            {message && <p className="italic opacity-80 mt-1">"{message}"</p>}
          </div>
        )}

        {/* Footer */}
        <div>
          <p 
            className="font-mono text-sm tracking-wider"
            style={{ color: textColor }}
          >
            {code}
          </p>
          
          {includeTerms && settings.terms_text && (
            <p 
              className="text-[10px] mt-2 opacity-50 max-w-[80%]"
              style={{ color: textColor }}
            >
              {settings.terms_text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

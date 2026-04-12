import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Code, Maximize2, ExternalLink, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedCodeGeneratorProps {
  bookingUrl: string;
}

type EmbedType = 'inline' | 'modal' | 'popup' | 'iframe';

const EMBED_TYPES = [
  {
    value: 'inline' as const,
    icon: Code,
    title: 'Inline Embed',
    description: 'Booking experience appears directly in your page where you place the container.',
  },
  {
    value: 'modal' as const,
    icon: Maximize2,
    title: 'Modal Launcher',
    description: 'A button opens the booking experience in a centered overlay.',
  },
  {
    value: 'popup' as const,
    icon: ExternalLink,
    title: 'Popup Launcher',
    description: 'A button opens booking in a new browser window.',
  },
  {
    value: 'iframe' as const,
    icon: Monitor,
    title: 'Iframe Fallback',
    description: 'Simple iframe embed for sites that don\'t support scripts.',
  },
];

function getOrgSlugFromUrl(bookingUrl: string): string {
  const match = bookingUrl.match(/\/book\/([^?#/]+)/);
  return match?.[1] || '';
}

function getOriginFromUrl(bookingUrl: string): string {
  try {
    return new URL(bookingUrl).origin;
  } catch {
    return window.location.origin;
  }
}

function generateSnippet(type: EmbedType, bookingUrl: string): string {
  const orgSlug = getOrgSlugFromUrl(bookingUrl);
  const origin = getOriginFromUrl(bookingUrl);
  const embedUrl = `${bookingUrl}?embed=true`;

  switch (type) {
    case 'inline':
      return `<!-- Zura Inline Booking Widget -->
<div id="zura-booking" style="min-height:600px"></div>
<script src="${origin}/embed.js"
  data-zura-org="${orgSlug}"
  data-zura-mode="inline"></script>`;

    case 'modal':
      return `<!-- Zura Modal Booking Launcher -->
<button onclick="window.ZuraBooking.open()"
  style="padding:12px 24px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500">
  Book Now
</button>
<script src="${origin}/embed.js"
  data-zura-org="${orgSlug}"
  data-zura-mode="modal"></script>`;

    case 'popup':
      return `<!-- Zura Popup Booking Link -->
<a href="${embedUrl}" target="_blank" rel="noopener noreferrer"
  style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">
  Book Now
</a>`;

    case 'iframe':
      return `<!-- Zura Booking Iframe -->
<iframe
  src="${embedUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border:none;border-radius:12px;max-width:800px"
  allow="payment"
  loading="lazy"
  title="Book an appointment"
></iframe>`;
  }
}

export function EmbedCodeGenerator({ bookingUrl }: EmbedCodeGeneratorProps) {
  const [selectedType, setSelectedType] = useState<EmbedType>('inline');

  const snippet = generateSnippet(selectedType, bookingUrl);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    toast.success('Embed code copied');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">EMBED CODE</CardTitle>
        <CardDescription>Add booking to your website with a simple code snippet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EMBED_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium text-foreground">{type.title}</p>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {EMBED_TYPES.find(t => t.value === selectedType)?.description}
        </p>

        <div className="relative">
          <pre className="bg-muted/50 rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed border border-border">
            {snippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={copySnippet}
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
          </Button>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Installation</p>
          {selectedType === 'inline' && <p>Paste the container div and script tag where you want the booking widget to appear on your page.</p>}
          {selectedType === 'modal' && <p>Place the button wherever you want a "Book Now" trigger. The script handles the modal overlay.</p>}
          {selectedType === 'popup' && <p>Add this link/button to your page. It opens your hosted booking page in a new tab.</p>}
          {selectedType === 'iframe' && <p>Place the iframe on your page. Adjust width and height as needed. Works on all websites.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

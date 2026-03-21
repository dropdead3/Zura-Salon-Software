import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KioskDeployCardProps {
  locationId: string | null;
  locationName?: string;
}

export function KioskDeployCard({ locationId, locationName }: KioskDeployCardProps) {
  const [copied, setCopied] = useState(false);
  
  const kioskUrl = locationId 
    ? `${window.location.origin}/kiosk/${locationId}`
    : null;

  const handleCopy = async () => {
    if (!kioskUrl) return;
    
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">DEPLOY TO DEVICE</CardTitle>
        <CardDescription>
          Scan this QR code on a tablet to launch the kiosk
        </CardDescription>
      </CardHeader>
      <CardContent>
        {kioskUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG 
                value={kioskUrl} 
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Location name */}
            {locationName && (
              <p className="text-sm font-medium text-center">
                {locationName}
              </p>
            )}

            {/* URL display */}
            <code className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md max-w-full overflow-hidden text-ellipsis">
              {kioskUrl}
            </code>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size={tokens.button.card}
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
              
              <Button 
                variant="outline" 
                size={tokens.button.card}
                asChild
                className="gap-2"
              >
                <a 
                  href={kioskUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a specific location to generate a deployment QR code
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

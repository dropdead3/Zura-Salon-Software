import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Download, Printer, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface VoucherQRCodeProps {
  voucherId: string;
  voucherCode: string;
  voucherValue: number;
  voucherType?: string;
  recipientName?: string;
  expiresAt?: string;
}

export function VoucherQRCode({
  voucherId,
  voucherCode,
  voucherValue,
  voucherType = 'Gift Card',
  recipientName,
  expiresAt,
}: VoucherQRCodeProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR data that includes all necessary redemption info
  const qrData = JSON.stringify({
    type: 'voucher',
    code: voucherCode,
    id: voucherId,
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${voucherId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
      }

      const link = document.createElement('a');
      link.download = `voucher-${voucherCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = document.getElementById(`qr-${voucherId}`)?.outerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voucher - ${voucherCode}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .voucher-card {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              text-align: center;
              max-width: 400px;
            }
            .value {
              font-size: 48px;
              font-weight: bold;
              margin: 16px 0;
            }
            .code {
              font-family: monospace;
              font-size: 24px;
              background: #f3f4f6;
              padding: 8px 16px;
              border-radius: 6px;
              margin: 16px 0;
            }
            .qr-container {
              margin: 24px 0;
            }
            .meta {
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <h2>${voucherType}</h2>
            <div class="value">${formatCurrency(voucherValue)}</div>
            ${recipientName ? `<p>For: ${recipientName}</p>` : ''}
            <div class="qr-container">${svg}</div>
            <div class="code">${voucherCode}</div>
            ${expiresAt ? `<p class="meta">Expires: ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <>
      <Button variant="outline" size={tokens.button.card} onClick={() => setIsOpen(true)}>
        <QrCode className="h-4 w-4 mr-2" />
        QR Code
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {voucherType} QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            <Card className="w-full">
              <CardContent className="p-6 flex flex-col items-center">
                <p className="text-3xl font-medium mb-4">{formatCurrency(voucherValue)}</p>
                
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    id={`qr-${voucherId}`}
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <code className="bg-muted px-3 py-1.5 rounded font-mono text-lg">
                    {voucherCode}
                  </code>
                  <Button size={tokens.button.inline} variant="ghost" onClick={handleCopyCode}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {recipientName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    For: {recipientName}
                  </p>
                )}

                {expiresAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {new Date(expiresAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2 w-full">
              <Button className="flex-1" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button className="flex-1" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface BulkQRGeneratorProps {
  vouchers: Array<{
    id: string;
    code: string;
    value: number;
    type?: string;
    recipient_name?: string;
    expires_at?: string;
  }>;
}

export function BulkQRGenerator({ vouchers }: BulkQRGeneratorProps) {
  const { formatCurrency } = useFormatCurrency();
  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const voucherCards = vouchers.map((v) => {
      const qrData = JSON.stringify({ type: 'voucher', code: v.code, id: v.id });
      return `
        <div class="voucher-card">
          <h3>${v.type || 'Gift Card'}</h3>
          <div class="value">${formatCurrency(v.value)}</div>
          <div class="qr-placeholder" data-qr="${encodeURIComponent(qrData)}"></div>
          <div class="code">${v.code}</div>
          ${v.recipient_name ? `<p class="recipient">For: ${v.recipient_name}</p>` : ''}
          ${v.expires_at ? `<p class="meta">Expires: ${new Date(v.expires_at).toLocaleDateString()}</p>` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vouchers - Bulk Print</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              padding: 20px;
            }
            .voucher-card {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              page-break-inside: avoid;
            }
            .value { font-size: 32px; font-weight: bold; margin: 8px 0; }
            .code {
              font-family: monospace;
              font-size: 18px;
              background: #f3f4f6;
              padding: 6px 12px;
              border-radius: 4px;
              margin: 12px 0;
            }
            .qr-placeholder { margin: 16px 0; }
            .meta { color: #6b7280; font-size: 12px; }
            @media print {
              body { padding: 0; gap: 10px; }
            }
          </style>
        </head>
        <body>
          ${voucherCards}
          <script>
            document.querySelectorAll('.qr-placeholder').forEach(el => {
              const qrData = decodeURIComponent(el.dataset.qr);
              const canvas = document.createElement('canvas');
              new QRious({ element: canvas, value: qrData, size: 120 });
              el.appendChild(canvas);
            });
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Button variant="outline" onClick={handlePrintAll}>
      <Printer className="h-4 w-4 mr-2" />
      Print All ({vouchers.length})
    </Button>
  );
}

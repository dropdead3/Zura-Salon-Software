import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Award, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';

interface TrainingCertificateButtonProps {
  userName: string;
  completedVideos: { title: string; category: string }[];
  completionDate: Date;
}

export function TrainingCertificateButton({
  userName,
  completedVideos,
  completionDate,
}: TrainingCertificateButtonProps) {
  const { formatDate } = useFormatDate();
  const [generating, setGenerating] = useState(false);

  const generateCertificate = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background gradient effect (simple version)
      doc.setFillColor(250, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Border
      doc.setDrawColor(180, 180, 200);
      doc.setLineWidth(1);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Inner border
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 120);
      doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 35, { align: 'center' });

      // Decorative line
      doc.setDrawColor(100, 100, 120);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - 40, 40, pageWidth / 2 + 40, 40);

      // Award icon placeholder
      doc.setFillColor(79, 70, 229); // Indigo
      doc.circle(pageWidth / 2, 55, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('★', pageWidth / 2, 58, { align: 'center' });

      // Main title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(30, 30, 40);
      doc.text('Training Complete', pageWidth / 2, 80, { align: 'center' });

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 100);
      doc.text('This is to certify that', pageWidth / 2, 95, { align: 'center' });

      // Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(79, 70, 229);
      doc.text(userName, pageWidth / 2, 112, { align: 'center' });

      // Underline for name
      const nameWidth = doc.getTextWidth(userName);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - nameWidth / 2, 115, pageWidth / 2 + nameWidth / 2, 115);

      // Completion text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 100);
      doc.text(
        'has successfully completed all required training modules',
        pageWidth / 2,
        128,
        { align: 'center' }
      );

      // Modules completed count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 40);
      doc.text(
        `${completedVideos.length} Training Modules Completed`,
        pageWidth / 2,
        142,
        { align: 'center' }
      );

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 120);
      doc.text(
        `Completed on ${formatDate(completionDate, 'MMMM d, yyyy')}`,
        pageWidth / 2,
        155,
        { align: 'center' }
      );

      // Signature line
      doc.setDrawColor(150, 150, 170);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - 40, 175, pageWidth / 2 + 40, 175);
      doc.setFontSize(9);
      doc.text('Authorized Signature', pageWidth / 2, 181, { align: 'center' });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 170);
      doc.text(
        `Certificate ID: ${Date.now().toString(36).toUpperCase()}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );

      // Save
      doc.save(`training-certificate-${userName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('Certificate downloaded!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={generateCertificate} disabled={generating} className="gap-2">
      {generating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Award className="w-4 h-4" />
          <Download className="w-4 h-4" />
        </>
      )}
      Download Certificate
    </Button>
  );
}

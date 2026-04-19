import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKiosk } from './KioskProvider';
import { useRequiredFormsForService } from '@/hooks/useServiceFormRequirements';
import {
  useUnsignedFormsForClient,
  useRecordSignature,
} from '@/hooks/useClientFormSignatures';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Wave 7 — Kiosk hard gate: full-screen, tablet-styled form sign loop.
 * Mounted when an arriving client has unsigned required forms for their
 * scheduled service. Reuses the same signing primitives as FormSigningDialog
 * but with kiosk-scale typography and tap targets.
 */
export function KioskFormSigningScreen() {
  const { session, resetToIdle, completeCheckin } = useKiosk();
  const appointment = session?.selectedAppointment;
  const clientId = session?.client?.id;

  // We don't have a service_id on the appointment view — look up by service_name fallback path is not ideal.
  // For now, fetch via the appointment's service_id when available; otherwise we trust the kiosk routing
  // logic in useKioskCheckin to only mount us when forms are required.
  const serviceId = (appointment as any)?.service_id as string | undefined;

  const { data: requirements = [] } = useRequiredFormsForService(serviceId);
  const { data: unsigned = [], isLoading } = useUnsignedFormsForClient(
    clientId,
    requirements,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());
  const [isFinalizing, setIsFinalizing] = useState(false);

  const recordSignature = useRecordSignature();

  const currentForm = unsigned[currentIndex];
  const template = currentForm?.form_template;
  const progress = useMemo(
    () => (unsigned.length > 0 ? (signedIds.size / unsigned.length) * 100 : 0),
    [signedIds.size, unsigned.length],
  );

  const renderContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) return <h3 key={idx} className="text-2xl font-medium mt-6 mb-3">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={idx} className="text-3xl font-medium mt-6 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={idx} className="text-4xl font-medium mt-6 mb-3">{line.slice(2)}</h1>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx} className="ml-6 mb-2 text-lg">{line.slice(2)}</li>;
      if (!line.trim()) return <br key={idx} />;
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={idx} className="mb-3 text-lg leading-relaxed">
            {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}
          </p>
        );
      }
      return <p key={idx} className="mb-3 text-lg leading-relaxed">{line}</p>;
    });
  };

  const handleSign = async () => {
    if (!template || !clientId || !agreed || !typedSignature.trim()) return;

    try {
      await recordSignature.mutateAsync({
        client_id: clientId,
        form_template_id: template.id,
        form_version: template.version,
        typed_signature: typedSignature.trim(),
        appointment_id: appointment?.id,
      });

      const newSigned = new Set(signedIds);
      newSigned.add(currentForm.id);
      setSignedIds(newSigned);

      if (currentIndex < unsigned.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setAgreed(false);
        setTypedSignature('');
      } else {
        // All signed — mark check-in row + advance kiosk state
        setIsFinalizing(true);
        if (appointment?.id) {
          await supabase
            .from('appointments')
            .update({
              forms_completed: true,
              forms_completed_at: new Date().toISOString(),
            })
            .eq('id', appointment.id);
        }
        completeCheckin();
      }
    } catch (err) {
      console.error('Kiosk signature failed:', err);
      toast.error('Could not save signature. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center bg-background"
      >
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </motion.div>
    );
  }

  if (!template || unsigned.length === 0 || !clientId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center bg-background p-12 text-center"
      >
        <CheckCircle2 className="w-20 h-20 text-primary mb-6" />
        <h2 className="text-3xl font-medium mb-3">All forms complete</h2>
        <p className="text-muted-foreground mb-8 text-lg">You're ready to check in.</p>
        <Button size="lg" className="h-14 px-10 text-lg" onClick={() => completeCheckin()}>
          Continue
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="kiosk-signing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="px-12 py-8 border-b border-border flex items-center justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={resetToIdle}
          className="h-12 text-base text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Cancel
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            Form {currentIndex + 1} of {unsigned.length}
          </p>
          <h1 className="text-2xl font-medium mt-1 flex items-center gap-3 justify-center">
            {template.name}
            <Badge variant="outline" className="text-xs">{template.version}</Badge>
          </h1>
        </div>
        <div className="w-24" />
      </div>

      <Progress value={progress} className="h-1 rounded-none" />

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0 overflow-hidden">
        <ScrollArea className="px-12 py-8">
          <div className="prose prose-lg dark:prose-invert max-w-3xl mx-auto">
            {renderContent(template.content)}
          </div>
        </ScrollArea>

        {/* Signature panel */}
        <div className="border-l border-border p-10 flex flex-col gap-6 bg-muted/30">
          <div>
            <h3 className="text-xl font-medium mb-2">Sign to continue</h3>
            <p className="text-sm text-muted-foreground">
              By signing below you agree to the terms of this form.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              className="mt-1 w-6 h-6"
            />
            <span className="text-base leading-snug">
              I have read and agree to the terms above.
            </span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type your full name</label>
            <Input
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Your full name"
              disabled={!agreed}
              className="h-14 text-xl font-serif"
            />
          </div>

          <div className="flex-1" />

          <Button
            size="lg"
            onClick={handleSign}
            disabled={
              !agreed ||
              !typedSignature.trim() ||
              recordSignature.isPending ||
              isFinalizing
            }
            className="h-16 text-lg"
          >
            {recordSignature.isPending || isFinalizing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : currentIndex < unsigned.length - 1 ? (
              'Sign & Continue'
            ) : (
              'Sign & Complete Check-in'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

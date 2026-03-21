import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, GitMerge } from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import { PrimarySelector } from './PrimarySelector';
import { ConflictResolver } from './ConflictResolver';
import { MergeConfirmation } from './MergeConfirmation';

export interface MergeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  notes: string | null;
  is_vip: boolean | null;
  visit_count: number | null;
  total_spend: number | null;
  last_visit_date: string | null;
  preferred_stylist_id: string | null;
  location_id: string | null;
  birthday?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  tags?: string[] | null;
  reminder_email_opt_in?: boolean | null;
  reminder_sms_opt_in?: boolean | null;
}

const STEPS = ['Select Clients', 'Choose Primary', 'Resolve Conflicts', 'Confirm Merge'];

interface MergeWizardProps {
  preselectedClientIds?: string[];
  onComplete: () => void;
  onCancel: () => void;
}

export function MergeWizard({ preselectedClientIds, onComplete, onCancel }: MergeWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedClients, setSelectedClients] = useState<MergeClient[]>([]);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, any>>({});

  const canProceed = () => {
    switch (step) {
      case 0: return selectedClients.length >= 2;
      case 1: return !!primaryClientId;
      case 2: return true; // Conflict resolution is optional
      case 3: return true;
      default: return false;
    }
  };

  // Auto-select primary: client with most visits
  useEffect(() => {
    if (step === 1 && !primaryClientId && selectedClients.length >= 2) {
      const sorted = [...selectedClients].sort(
        (a, b) => (b.visit_count || 0) - (a.visit_count || 0)
      );
      setPrimaryClientId(sorted[0].id);
    }
  }, [step, selectedClients, primaryClientId]);

  const primaryClient = selectedClients.find(c => c.id === primaryClientId);
  const secondaryClients = selectedClients.filter(c => c.id !== primaryClientId);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
              i < step ? 'bg-primary text-primary-foreground' :
              i === step ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground')}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-wide flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            {STEPS[step]}
          </CardTitle>
          <CardDescription>
            {step === 0 && 'Search and select 2 or more client profiles to merge.')}
            {step === 1 && 'Choose which profile will be the primary (surviving) record.')}
            {step === 2 && 'Review and resolve field conflicts between the selected profiles.')}
            {step === 3 && 'Review the merge summary and confirm by typing MERGE.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <ClientSelector
              selectedClients={selectedClients}
              onSelectionChange={setSelectedClients}
              preselectedIds={preselectedClientIds}
            />
          )}
          {step === 1 && (
            <PrimarySelector
              clients={selectedClients}
              primaryClientId={primaryClientId}
              onSelectPrimary={setPrimaryClientId}
            />
          )}
          {step === 2 && primaryClient && secondaryClients.length > 0 && (
            <ConflictResolver
              primaryClient={primaryClient}
              secondaryClients={secondaryClients}
              fieldResolutions={fieldResolutions}
              onResolutionsChange={setFieldResolutions}
            />
          )}
          {step === 3 && primaryClient && (
            <MergeConfirmation
              primaryClient={primaryClient}
              secondaryClients={secondaryClients}
              fieldResolutions={fieldResolutions}
              onComplete={onComplete}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Cancel' : 'Back')}
        </Button>
        {step < 3 && (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

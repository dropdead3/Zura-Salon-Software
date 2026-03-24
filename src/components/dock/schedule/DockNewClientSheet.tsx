/**
 * DockNewClientSheet — Platform-themed bottom sheet for creating a walk-in client
 * from the Dock booking flow. Minimal fields, duplicate detection, and Phorest sync.
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { toast } from 'sonner';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DOCK_SHEET } from '../dock-ui-tokens';

const SPRING = { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.8 };

const GENDERS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say'] as const;

interface DockNewClientSheetProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  organizationId: string;
  defaultName?: string;
  onClientCreated: (client: {
    id: string;
    phorest_client_id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }) => void;
}

export function DockNewClientSheet({
  open,
  onClose,
  locationId,
  organizationId,
  defaultName,
  onClientCreated,
}: DockNewClientSheetProps) {
  const queryClient = useQueryClient();
  const dragControls = useDragControls();
  const { isDemoMode } = useDockDemo();
  const bypassDuplicateRef = useRef(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Auto-populate name from search query when sheet opens
  useEffect(() => {
    if (open && defaultName) {
      const trimmed = defaultName.trim();
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0) {
        setFirstName(trimmed.slice(0, spaceIdx));
        setLastName(trimmed.slice(spaceIdx + 1));
      } else {
        setFirstName(trimmed);
        setLastName('');
      }
    }
  }, [open, defaultName]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Female');

  // Debounced values for duplicate detection
  const debouncedEmail = useDebounce(email.trim(), 500);
  const debouncedPhone = useDebounce(phone.replace(/\D/g, ''), 500);

  const { data: duplicates = [] } = useDuplicateDetection(
    debouncedEmail || null,
    debouncedPhone || null,
  );

  // Get location to check for phorest_branch_id
  const { data: location } = useQuery({
    queryKey: ['dock-location-detail', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, phorest_branch_id, name')
        .eq('id', locationId)
        .single();
      return data;
    },
    enabled: !!locationId && !isDemoMode,
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setGender('Female');
    bypassDuplicateRef.current = false;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const createClient = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 600));
        return {
          id: `demo-${Date.now()}`,
          phorest_client_id: '',
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim() || null,
          phone: phone.replace(/\D/g, '').trim() || null,
        };
      }

      if (location?.phorest_branch_id) {
        const response = await supabase.functions.invoke('create-phorest-client', {
          body: {
            branch_id: location.phorest_branch_id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            gender: gender || undefined,
            email: email.trim() || undefined,
            phone: phone.replace(/\D/g, '').trim() || undefined,
          },
        });

        if (response.error) throw response.error;
        if (!response.data?.success) throw new Error(response.data?.error || 'Failed to create client');
        return response.data.client;
      }

      // Fallback: insert directly into clients table
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender: gender || null,
          email: email.trim() || null,
          mobile: phone.replace(/\D/g, '').trim() || null,
          location_id: locationId,
          organization_id: organizationId,
          import_source: 'manual',
          status: 'active',
        })
        .select('id, first_name, last_name, email, mobile, phorest_client_id')
        .single();

      if (error) throw error;

      return {
        id: newClient.id,
        phorest_client_id: newClient.phorest_client_id || '',
        name: `${newClient.first_name} ${newClient.last_name}`,
        email: newClient.email,
        phone: newClient.mobile,
      };
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      queryClient.invalidateQueries({ queryKey: ['dock-booking-clients'] });
      toast.success('Client created');
      onClientCreated(client);
      handleClose();
    },
    onError: (err: Error) => {
      toast.error('Failed to create client', { description: err.message });
    },
  });

  const canSubmit = firstName.trim() && lastName.trim() && (email.trim() || phone.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (duplicates.length > 0 && !bypassDuplicateRef.current) {
      // Show inline warning — don't submit yet
      return;
    }

    bypassDuplicateRef.current = false;
    createClient.mutate();
  };

  const handleCreateAnyway = () => {
    bypassDuplicateRef.current = true;
    createClient.mutate();
  };

  const handleUseExisting = (dup: typeof duplicates[0]) => {
    onClientCreated({
      id: dup.id,
      phorest_client_id: '',
      name: `${dup.first_name} ${dup.last_name}`,
      email: dup.email,
      phone: dup.mobile,
    });
    handleClose();
  };

  const showDuplicateWarning = duplicates.length > 0 && !bypassDuplicateRef.current && canSubmit;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dock-newclient-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="dock-newclient-sheet"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.4, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -120 || info.velocity.y < -500) handleClose();
            }}
            className="absolute inset-x-0 top-0 z-[71] flex flex-col bg-[hsl(var(--platform-bg))] border-b border-[hsl(var(--platform-border))] rounded-b-2xl"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-7 pt-4 pb-3">
              <div className="w-9 h-9 rounded-full bg-violet-600/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))] flex-1">
                New Client
              </h2>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
                <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-7 pb-6 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="First Name *">
                  <DockInput
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="Jane"
                    autoFocus
                  />
                </FieldGroup>
                <FieldGroup label="Last Name *">
                  <DockInput
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Doe"
                  />
                </FieldGroup>
              </div>

              {/* Phone */}
              <FieldGroup label="Phone">
                <DockInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="(555) 123-4567"
                  type="tel"
                  inputMode="tel"
                />
              </FieldGroup>

              {/* Email */}
              <FieldGroup label="Email">
                <DockInput
                  value={email}
                  onChange={setEmail}
                  placeholder="jane@example.com"
                  type="email"
                  inputMode="email"
                />
              </FieldGroup>

              <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
                * Phone or email required for contact
              </p>

              {/* Gender pills */}
              <FieldGroup label="Gender">
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setGender(gender === opt ? '' : opt)}
                      className={cn(
                        'rounded-full px-4 py-2 text-xs font-sans border transition-colors',
                        gender === opt
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-transparent text-[hsl(var(--platform-foreground-muted))] border-[hsl(var(--platform-border))] hover:border-violet-500/40',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Duplicate Warning */}
              {showDuplicateWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Possible match found
                  </div>
                  {duplicates.map((dup) => (
                    <div key={dup.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-[hsl(var(--platform-foreground))] truncate">
                          {dup.first_name} {dup.last_name}
                        </div>
                        <div className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
                          {dup.email || dup.mobile || ''} · Match: {dup.match_type}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUseExisting(dup)}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-sans bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors"
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleCreateAnyway}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-sans text-[hsl(var(--platform-foreground-muted))] border border-[hsl(var(--platform-border))] hover:bg-[hsl(var(--platform-foreground)/0.06)] transition-colors"
                  >
                    Create New Anyway
                  </button>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || createClient.isPending}
                className="w-full h-12 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {createClient.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : showDuplicateWarning ? (
                  'Review Match Above'
                ) : (
                  'Create Client'
                )}
              </button>
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom}>
              <div
                className={DOCK_SHEET.dragHandle}
                onPointerDown={(e) => dragControls.start(e)}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Helpers ─── */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function DockInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoFocus?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (type === 'tel') {
      val = formatPhoneNumber(val);
    }
    onChange(val);
  };

  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full h-11 px-4 rounded-xl bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border)/0.5)] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:border-violet-500/50 transition-colors"
    />
  );
}

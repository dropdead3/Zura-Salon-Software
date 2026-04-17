import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, ChevronDown, ChevronUp, Star, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  useClientTransformations,
  useAddTransformation,
  useUpdateTransformation,
  type ClientTransformation,
} from '@/hooks/useClientTransformations';
import { useClientFormulaHistory, type ClientFormula } from '@/hooks/color-bar/useClientFormulaHistory';
import { CompareVisitsDialog } from './CompareVisitsDialog';

interface TransformationTimelineProps {
  clientId: string;
  phorestClientId?: string | null;
}

const PORTFOLIO_CATEGORIES = ['Blondes', 'Balayage', 'Color Corrections', 'Extensions', 'Vivids', 'Brunettes', 'Custom'];

export function TransformationTimeline({ clientId, phorestClientId }: TransformationTimelineProps) {
  const { data: transformations = [], isLoading } = useClientTransformations(phorestClientId || clientId);
  const { data: formulas = [] } = useClientFormulaHistory(phorestClientId || clientId);
  const addTransformation = useAddTransformation();
  const updateTransformation = useUpdateTransformation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareEntries, setCompareEntries] = useState<ClientTransformation[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Add form state
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [notes, setNotes] = useState('');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().split('T')[0]);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const getFormulasForAppointment = (appointmentId: string | null): ClientFormula[] => {
    if (!appointmentId) return [];
    return formulas.filter(f => f.appointment_id === appointmentId);
  };

  const handleAdd = async () => {
    if (!beforeFile && !afterFile) return;
    await addTransformation.mutateAsync({
      clientId: phorestClientId || clientId,
      beforeFile: beforeFile || undefined,
      afterFile: afterFile || undefined,
      serviceName: serviceName || undefined,
      notes: notes || undefined,
      takenAt,
    });
    setShowAddForm(false);
    setBeforeFile(null);
    setAfterFile(null);
    setServiceName('');
    setNotes('');
  };

  const togglePortfolio = (t: ClientTransformation) => {
    updateTransformation.mutate({
      id: t.id,
      clientId: t.client_id,
      updates: { portfolio_approved: !t.portfolio_approved },
    });
  };

  const toggleCompareEntry = (t: ClientTransformation) => {
    setCompareEntries(prev => {
      const exists = prev.find(e => e.id === t.id);
      if (exists) return prev.filter(e => e.id !== t.id);
      if (prev.length >= 2) return [prev[1], t];
      return [...prev, t];
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (transformations.length === 0 && !showAddForm) {
    return (
      <div className={tokens.empty.container}>
        <Camera className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No photos yet</h3>
        <p className={tokens.empty.description}>No inspiration, consultation, or transformation photos have been added yet. Build a visual history of this client's hair journey by capturing before-and-after shots.</p>
        <Button onClick={() => setShowAddForm(true)} className="mt-4 gap-2">
          <Plus className="w-4 h-4" />
          Add First Transformation
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Transformation
        </Button>
        {compareEntries.length === 2 && (
          <Button size="sm" onClick={() => setShowCompare(true)} className="gap-1.5">
            Compare ({compareEntries.length})
          </Button>
        )}
        {compareEntries.length > 0 && compareEntries.length < 2 && (
          <span className={tokens.body.muted}>Select 1 more to compare</span>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className={tokens.card.inner}>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Before photo */}
                  <div>
                    <Label className={tokens.label.default}>Before</Label>
                    <input ref={beforeRef} type="file" accept="image/*" className="hidden" onChange={e => setBeforeFile(e.target.files?.[0] || null)} />
                    <button
                      onClick={() => beforeRef.current?.click()}
                      className={cn(
                        'w-full aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 mt-1',
                        'hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden'
                      )}
                    >
                      {beforeFile ? (
                        <img src={URL.createObjectURL(beforeFile)} alt="Before preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <span className={tokens.body.muted}>Tap to add</span>
                        </>
                      )}
                    </button>
                  </div>
                  {/* After photo */}
                  <div>
                    <Label className={tokens.label.default}>After</Label>
                    <input ref={afterRef} type="file" accept="image/*" className="hidden" onChange={e => setAfterFile(e.target.files?.[0] || null)} />
                    <button
                      onClick={() => afterRef.current?.click()}
                      className={cn(
                        'w-full aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 mt-1',
                        'hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden'
                      )}
                    >
                      {afterFile ? (
                        <img src={URL.createObjectURL(afterFile)} alt="After preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <span className={tokens.body.muted}>Tap to add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={tokens.label.default}>Service</Label>
                    <Input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="e.g. Full Highlight" className="mt-1" />
                  </div>
                  <div>
                    <Label className={tokens.label.default}>Date</Label>
                    <Input type="date" value={takenAt} onChange={e => setTakenAt(e.target.value)} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label className={tokens.label.default}>Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Processing notes, observations..." rows={2} className="mt-1" />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAdd} disabled={addTransformation.isPending || (!beforeFile && !afterFile)} className="gap-1.5">
                    {addTransformation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline entries */}
      <div className="space-y-3">
        {transformations.map(t => {
          const isExpanded = expandedId === t.id;
          const isCompareSelected = compareEntries.some(e => e.id === t.id);
          const linkedFormulas = getFormulasForAppointment(t.appointment_id);

          return (
            <motion.div
              key={t.id}
              layout
              className={cn(
                tokens.card.inner,
                'p-3 transition-all',
                isCompareSelected && 'ring-2 ring-primary/40'
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={tokens.body.emphasis}>
                    {t.taken_at ? format(new Date(t.taken_at + 'T00:00:00'), 'MMM d, yyyy') : 'No date'}
                  </span>
                  {t.service_name && (
                    <Badge variant="secondary" className="text-[10px]">{t.service_name}</Badge>
                  )}
                  {t.portfolio_approved && (
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={isCompareSelected ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleCompareEntry(t)}
                    title="Select for comparison"
                  >
                    <span className="text-[10px] font-medium">vs</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Photo thumbnails */}
              <div className="grid grid-cols-2 gap-2">
                <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                  {t.before_url ? (
                    <img src={t.before_url} alt="Before" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={cn(tokens.body.muted, 'text-xs')}>No before</span>
                    </div>
                  )}
                </div>
                <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                  {t.after_url ? (
                    <img src={t.after_url} alt="After" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={cn(tokens.body.muted, 'text-xs')}>No after</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-3 pt-3 border-t border-border/40"
                  >
                    {/* Formula section */}
                    {linkedFormulas.length > 0 && (
                      <div>
                        <span className={tokens.label.tiny}>Formula</span>
                        <div className="mt-1 space-y-1">
                          {linkedFormulas.map(f => (
                            <div key={f.id} className="text-xs space-y-0.5">
                              {f.service_name && <span className={tokens.body.emphasis}>{f.service_name}</span>}
                              {f.formula_data?.map((line, i) => (
                                <div key={i} className={tokens.body.muted}>
                                  {line.product_name} — {line.quantity}{line.unit || 'g'}
                                </div>
                              ))}
                              {f.notes && <div className={cn(tokens.body.muted, 'italic')}>{f.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {t.notes && (
                      <div>
                        <span className={tokens.label.tiny}>Notes</span>
                        <p className={cn(tokens.body.muted, 'mt-1')}>{t.notes}</p>
                      </div>
                    )}

                    {/* Portfolio toggle */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant={t.portfolio_approved ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => togglePortfolio(t)}
                        className="gap-1.5 text-xs"
                      >
                        <Star className={cn('w-3 h-3', t.portfolio_approved && 'fill-current')} />
                        {t.portfolio_approved ? 'Portfolio Approved' : 'Add to Portfolio'}
                      </Button>
                      {t.portfolio_approved && (
                        <select
                          value={t.portfolio_category || ''}
                          onChange={e =>
                            updateTransformation.mutate({
                              id: t.id,
                              clientId: t.client_id,
                              updates: { portfolio_category: e.target.value || null },
                            })
                          }
                          className="text-xs bg-transparent border border-border rounded-lg px-2 py-1"
                        >
                          <option value="">Category</option>
                          {PORTFOLIO_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Compare dialog */}
      {compareEntries.length === 2 && (
        <CompareVisitsDialog
          open={showCompare}
          onOpenChange={setShowCompare}
          entryA={compareEntries[0]}
          entryB={compareEntries[1]}
          formulasA={getFormulasForAppointment(compareEntries[0].appointment_id)}
          formulasB={getFormulasForAppointment(compareEntries[1].appointment_id)}
        />
      )}
    </div>
  );
}

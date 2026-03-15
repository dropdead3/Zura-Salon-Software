import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ParsedRow {
  brand: string;
  name: string;
  category: string;
  default_depletion: string;
  default_unit: string;
  size_options: string[];
  valid: boolean;
  error?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const brandIdx = headers.findIndex((h) => h === 'brand');
  const nameIdx = headers.findIndex((h) => h === 'name');
  const catIdx = headers.findIndex((h) => h === 'category');
  const depIdx = headers.findIndex((h) => ['depletion', 'default_depletion'].includes(h));
  const unitIdx = headers.findIndex((h) => ['unit', 'default_unit'].includes(h));
  const sizeIdx = headers.findIndex((h) => ['sizes', 'size_options'].includes(h));

  if (brandIdx === -1 || nameIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^['"]|['"]$/g, ''));
    const brand = cols[brandIdx] || '';
    const name = cols[nameIdx] || '';
    const category = catIdx >= 0 ? cols[catIdx] || 'color' : 'color';
    const depletion = depIdx >= 0 ? cols[depIdx] || 'weighed' : 'weighed';
    const unit = unitIdx >= 0 ? cols[unitIdx] || 'g' : 'g';
    const sizes = sizeIdx >= 0 ? (cols[sizeIdx] || '').split(';').map((s) => s.trim()).filter(Boolean) : [];

    const valid = brand.length > 0 && name.length > 0;
    return {
      brand, name, category, default_depletion: depletion, default_unit: unit, size_options: sizes,
      valid, error: !valid ? 'Missing brand or name' : undefined,
    };
  });
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const BATCH = 200;
      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH).map((r) => ({
          brand: r.brand, name: r.name, category: r.category,
          default_depletion: r.default_depletion, default_unit: r.default_unit,
          size_options: r.size_options, is_active: true,
        }));
        const { error } = await supabase.from('supply_library_products').insert(batch);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      toast.success(`Imported ${validRows.length} products`);
      onOpenChange(false);
      setRows([]);
      setFileName('');
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setRows([]); setFileName(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-sans text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Import CSV
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Upload a CSV with columns: brand, name, category, depletion, unit, sizes (semicolon-separated)
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-sans text-sm text-muted-foreground">Click to select a CSV file</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>
        ) : (
          <div className="space-y-3 overflow-auto flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-sans text-xs">{fileName}</Badge>
                <span className="font-sans text-xs text-muted-foreground">
                  {validRows.length} valid, {invalidRows.length} invalid
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="font-sans text-xs">Clear</Button>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="font-sans text-xs text-destructive">{invalidRows.length} row(s) will be skipped due to missing data</span>
              </div>
            )}
            <div className="rounded-lg border border-border/50 max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Name</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Category</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i} className={cn(!r.valid && 'opacity-40')}>
                      <TableCell className="font-sans text-xs">{r.brand || '—'}</TableCell>
                      <TableCell className="font-sans text-xs">{r.name || '—'}</TableCell>
                      <TableCell className="font-sans text-xs">{r.category}</TableCell>
                      <TableCell className="font-sans text-xs">{r.default_unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <div className="px-4 py-2 text-xs text-muted-foreground font-sans border-t border-border/40">
                  Showing 50 of {rows.length} rows
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans" disabled={importing}>Cancel</Button>
          {rows.length > 0 && (
            <Button onClick={handleImport} disabled={importing || validRows.length === 0} className="font-sans">
              {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : `Import ${validRows.length} Products`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

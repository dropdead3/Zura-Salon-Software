import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  X,
  FlaskConical,
  Download,
  Info,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';

interface DataImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: string;
  dataType: string;
  organizationId?: string;
}

// Entity types that require location selection for data isolation
const LOCATION_REQUIRED_TYPES = ['clients', 'appointments', 'staff', 'products'];

// Field definitions for each data type
const FIELD_DEFINITIONS: Record<string, { field: string; label: string; required: boolean }[]> = {
  clients: [
    { field: 'first_name', label: 'First Name', required: true },
    { field: 'last_name', label: 'Last Name', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'mobile', label: 'Mobile', required: false },
    { field: 'notes', label: 'Notes', required: false },
    { field: 'external_id', label: 'External ID', required: false },
    { field: 'visit_count', label: 'Visit Count', required: false },
    { field: 'total_spend', label: 'Total Spend', required: false },
    { field: 'last_visit_date', label: 'Last Visit Date', required: false },
    { field: 'is_vip', label: 'VIP Status', required: false },
  ],
  appointments: [
    { field: 'client_name', label: 'Client Name', required: true },
    { field: 'appointment_date', label: 'Date', required: true },
    { field: 'start_time', label: 'Start Time', required: true },
    { field: 'end_time', label: 'End Time', required: true },
    { field: 'service_name', label: 'Service', required: false },
    { field: 'staff_name', label: 'Staff Name', required: false },
    { field: 'status', label: 'Status', required: false },
    { field: 'total_price', label: 'Price', required: false },
    { field: 'notes', label: 'Notes', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
  services: [
    { field: 'name', label: 'Service Name', required: true },
    { field: 'category', label: 'Category', required: false },
    { field: 'duration_minutes', label: 'Duration (mins)', required: false },
    { field: 'price', label: 'Price', required: false },
    { field: 'description', label: 'Description', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
  transactions: [
    { field: 'transaction_date', label: 'Date', required: true },
    { field: 'client_name', label: 'Client Name', required: false },
    { field: 'staff_name', label: 'Staff Name', required: false },
    { field: 'item_name', label: 'Item/Service', required: true },
    { field: 'quantity', label: 'Quantity', required: false },
    { field: 'unit_price', label: 'Unit Price', required: false },
    { field: 'total_amount', label: 'Total Amount', required: true },
    { field: 'payment_method', label: 'Payment Method', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
  staff: [
    { field: 'full_name', label: 'Full Name', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'hire_date', label: 'Hire Date', required: false },
    { field: 'stylist_level', label: 'Level/Tier', required: false },
    { field: 'specialties', label: 'Specialties', required: false },
    { field: 'bio', label: 'Bio', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
  locations: [
    { field: 'name', label: 'Location Name', required: true },
    { field: 'address', label: 'Address', required: true },
    { field: 'city', label: 'City', required: true },
    { field: 'state_province', label: 'State/Province', required: false },
    { field: 'phone', label: 'Phone', required: true },
    { field: 'hours', label: 'Hours', required: false },
    { field: 'store_number', label: 'Store Number', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
  products: [
    { field: 'name', label: 'Product Name', required: true },
    { field: 'sku', label: 'SKU', required: false },
    { field: 'barcode', label: 'Barcode', required: false },
    { field: 'category', label: 'Category', required: false },
    { field: 'brand', label: 'Brand', required: false },
    { field: 'retail_price', label: 'Retail Price', required: false },
    { field: 'cost_price', label: 'Cost Price', required: false },
    { field: 'quantity_on_hand', label: 'Quantity', required: false },
    { field: 'description', label: 'Description', required: false },
    { field: 'external_id', label: 'External ID', required: false },
  ],
};

type WizardStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function DataImportWizard({
  open,
  onOpenChange,
  sourceType,
  dataType,
  organizationId,
}: DataImportWizardProps) {
  const queryClient = useQueryClient();
  const { data: locations } = useLocations(organizationId);
  
  const requiresLocation = LOCATION_REQUIRED_TYPES.includes(dataType);
  
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isDryRun, setIsDryRun] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    would_import?: number;
    failed: number;
    errors: string[];
    is_dry_run?: boolean;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fields = FIELD_DEFINITIONS[dataType] || [];

  const resetWizard = useCallback(() => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setFieldMapping({});
    setIsDryRun(false);
    setImportProgress(0);
    setImportResult(null);
    setIsProcessing(false);
  }, []);

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Parse data rows
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, data };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const text = await uploadedFile.text();
      const { headers, data } = parseCSV(text);
      
      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map fields based on header names
      const autoMapping: Record<string, string> = {};
      fields.forEach(field => {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().replace(/[_\s-]/g, '') === field.field.toLowerCase().replace(/[_\s-]/g, '') ||
          h.toLowerCase().includes(field.label.toLowerCase()) ||
          field.label.toLowerCase().includes(h.toLowerCase())
        );
        if (matchingHeader) {
          autoMapping[field.field] = matchingHeader;
        }
      });
      setFieldMapping(autoMapping);

      setStep('mapping');
    } catch (error) {
      toast.error('Failed to parse CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (field: string, csvColumn: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: csvColumn === '_none' ? '' : csvColumn,
    }));
  };

  const getPreviewData = () => {
    return csvData.slice(0, 5).map(row => {
      const mapped: Record<string, string> = {};
      Object.entries(fieldMapping).forEach(([field, csvColumn]) => {
        if (csvColumn) {
          mapped[field] = row[csvColumn] || '';
        }
      });
      return mapped;
    });
  };

  const validateMapping = () => {
    const requiredFields = fields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !fieldMapping[f.field]);
    return missingRequired.length === 0;
  };

  const handleImport = async () => {
    if (!validateMapping()) {
      toast.error('Please map all required fields');
      return;
    }

    setStep('importing');
    setImportProgress(0);

    try {
      // Transform data according to mapping
      const transformedData = csvData.map(row => {
        const mapped: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn] !== undefined) {
            mapped[field] = row[csvColumn];
          }
        });
        return mapped;
      });

      // Call import edge function
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: {
          source_type: sourceType,
          entity_type: dataType,
          data: transformedData,
          location_id: selectedLocationId || undefined,
          organization_id: organizationId,
          column_mappings: fieldMapping,
          dry_run: isDryRun,
        },
      });

      if (error) throw error;

      setImportResult({
        total: data.summary?.total || transformedData.length,
        imported: data.summary?.imported || 0,
        would_import: data.summary?.would_import,
        failed: data.summary?.failed || 0,
        errors: data.errors?.map((e: any) => `Row ${e.row}: ${e.error}`) || [],
        is_dry_run: data.dry_run || isDryRun,
      });
      setImportProgress(100);
      setStep('complete');

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [dataType] });
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });

      if (isDryRun) {
        toast.success(`Dry run complete: ${data.summary?.would_import || 0} records would be imported`);
      } else {
        toast.success(`Successfully imported ${data.summary?.imported || 0} records`);
      }
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
      setStep('preview');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              {isProcessing ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
              ) : (
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-lg font-medium mb-2">
                {file ? file.name : 'Upload your CSV file'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop or click to browse
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
                disabled={isProcessing}
              />
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Assign to Location {requiresLocation ? '(required)' : '(optional)'}
                {requiresLocation && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className={cn(
                  requiresLocation && !selectedLocationId && "border-destructive"
                )}>
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {!requiresLocation && (
                    <SelectItem value="">No specific location</SelectItem>
                  )}
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requiresLocation && !selectedLocationId ? (
                <p className="text-xs text-destructive">
                  Location is required for {dataType} imports to maintain data isolation
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  All imported records will be associated with this location
                </p>
              )}
            </div>

            {/* Continue button for upload step */}
            {file && csvData.length > 0 && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep('mapping')}
                  disabled={requiresLocation && !selectedLocationId}
                >
                  Continue to Mapping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {csvData.length} rows • {csvHeaders.length} columns
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Map CSV columns to fields</Label>
              <div className="space-y-3">
                {fields.map(field => (
                  <div key={field.field} className="flex items-center gap-4">
                    <div className="w-1/3 flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        field.required && "font-medium"
                      )}>
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </span>
                    </div>
                    <Select
                      value={fieldMapping[field.field] || '_none'}
                      onValueChange={(v) => handleMappingChange(field.field, v)}
                    >
                      <SelectTrigger className="w-2/3">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">-- Not mapped --</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'preview':
        const previewData = getPreviewData();
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Preview of first {previewData.length} records
              </p>
              {!validateMapping() && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Missing required fields
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.filter(f => fieldMapping[f.field]).map(f => (
                      <TableHead key={f.field} className="whitespace-nowrap">
                        {f.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {fields.filter(f => fieldMapping[f.field]).map(f => (
                        <TableCell key={f.field} className="whitespace-nowrap">
                          {row[f.field] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Dry Run Toggle */}
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FlaskConical className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="dry-run" className="font-medium">Dry Run (Validate Only)</Label>
                    <p className="text-xs text-muted-foreground">
                      Preview what will be imported without making changes
                    </p>
                  </div>
                </div>
                <Switch
                  id="dry-run"
                  checked={isDryRun}
                  onCheckedChange={setIsDryRun}
                />
              </div>
              
              <p className="text-sm">
                <strong>{csvData.length}</strong> total records will be {isDryRun ? 'validated' : 'imported'} to{' '}
                <strong className="capitalize">{dataType}</strong>
                {selectedLocationId && locations && (
                  <> at <strong>{locations.find(l => l.id === selectedLocationId)?.name}</strong></>
                )}
              </p>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="py-12 text-center space-y-6">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium mb-2">
                {isDryRun ? 'Validating your data...' : 'Importing your data...'}
              </p>
              <p className="text-sm text-muted-foreground">
                Please don't close this window
              </p>
            </div>
            <Progress value={importProgress} className="max-w-xs mx-auto" />
          </div>
        );

      case 'complete':
        const isDryRunResult = importResult?.is_dry_run;
        return (
          <div className="py-8 text-center space-y-6">
            {isDryRunResult ? (
              <FlaskConical className="w-16 h-16 mx-auto text-blue-500" />
            ) : importResult?.failed === 0 ? (
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            ) : (
              <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
            )}
            <div>
              <p className="text-lg font-medium mb-2">
                {isDryRunResult ? 'Dry Run Complete' : 'Import Complete'}
              </p>
              {isDryRunResult && (
                <Badge variant="secondary" className="mb-3">
                  <FlaskConical className="w-3 h-3 mr-1" />
                  No data was imported
                </Badge>
              )}
              <div className="flex items-center justify-center gap-6 text-sm">
                {isDryRunResult ? (
                  <span className="text-blue-600">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    {importResult?.would_import || 0} would be imported
                  </span>
                ) : (
                  <span className="text-green-600">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    {importResult?.imported} imported
                  </span>
                )}
                {importResult?.failed && importResult.failed > 0 && (
                  <span className="text-red-600">
                    <X className="w-4 h-4 inline mr-1" />
                    {importResult.failed} failed
                  </span>
                )}
              </div>
            </div>

            {isDryRunResult && (importResult?.would_import || 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                Ready to import? Run again with dry run disabled.
              </p>
            )}

            {importResult?.errors && importResult.errors.length > 0 && (
              <ScrollArea className="h-32 border rounded-lg p-3 text-left">
                <p className="text-sm font-medium mb-2">Errors:</p>
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
                {importResult.errors.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {importResult.errors.length - 10} more errors
                  </p>
                )}
              </ScrollArea>
            )}
          </div>
        );
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 'upload': return false; // Next is automatic after file upload
      case 'mapping': return true;
      case 'preview': return validateMapping();
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 'mapping') setStep('preview');
    else if (step === 'preview') handleImport();
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'preview') setStep('mapping');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload your CSV file to begin'}
            {step === 'mapping' && 'Map your CSV columns to the correct fields'}
            {step === 'preview' && 'Review your data before importing'}
            {step === 'importing' && 'Processing your import...'}
            {step === 'complete' && 'Your import has finished'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s ? "bg-primary text-primary-foreground" :
                ['mapping', 'preview', 'complete'].indexOf(step) > i - 1 ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {renderStep()}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'upload' || step === 'importing' || step === 'complete'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {step === 'complete' ? (
              <Button onClick={handleClose}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {step !== 'upload' && step !== 'importing' && (
                  <Button onClick={handleNext} disabled={!canGoNext()}>
                    {step === 'preview' ? 'Import Data' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

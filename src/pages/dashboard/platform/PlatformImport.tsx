import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Upload, 
  AlertCircle, 
  FileSpreadsheet,
  Users,
  Scissors,
  Calendar,
  UserCog,
  MapPin,
  Package,
  LucideIcon,
  History,
  Loader2,
  Database,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useImportJobs } from '@/hooks/useImportJobs';
import { DataImportWizard } from '@/components/admin/DataImportWizard';
import { ImportHistoryCard } from '@/components/admin/ImportHistoryCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
  SelectValue,
} from '@/components/platform/ui/PlatformSelect';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface ImportType {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const importTypes: ImportType[] = [
  { value: 'clients', label: 'Clients', description: 'Import customer data', icon: Users },
  { value: 'services', label: 'Services', description: 'Import service catalog', icon: Scissors },
  { value: 'appointments', label: 'Appointments', description: 'Import booking history', icon: Calendar },
  { value: 'staff', label: 'Staff', description: 'Import team members', icon: UserCog },
  { value: 'locations', label: 'Locations', description: 'Import salon branches', icon: MapPin },
  { value: 'products', label: 'Products', description: 'Import retail inventory', icon: Package },
];

export default function PlatformImport() {
  const [searchParams] = useSearchParams();
  const { data: organizations, isLoading } = useOrganizations();
  const { data: importJobs = [], isLoading: loadingJobs } = useImportJobs({ limit: 30 });
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedDataType, setSelectedDataType] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Pre-select organization from URL params
  useEffect(() => {
    const orgFromUrl = searchParams.get('org');
    if (orgFromUrl && organizations?.some(o => o.id === orgFromUrl)) {
      setSelectedOrgId(orgFromUrl);
    }
  }, [searchParams, organizations]);

  const selectedOrg = organizations?.find(o => o.id === selectedOrgId);

  const handleStartImport = (dataType: string) => {
    setSelectedDataType(dataType);
    setWizardOpen(true);
  };

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Data Migration"
        description="Import data from external software into accounts"
      />
      <PageExplainer pageId="platform-import" />

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-slate-700">
            <Upload className="w-4 h-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-slate-700">
            <History className="w-4 h-4" />
            Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          {/* Organization Selector */}
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-400" />
                Select Target Organization
              </PlatformCardTitle>
              <PlatformCardDescription>
                Choose which account to import data into
              </PlatformCardDescription>
            </PlatformCardHeader>
            <PlatformCardContent>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-full max-w-md bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                  <SelectValue placeholder="Select an organization..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {organizations?.map((org) => (
                    <SelectItem 
                      key={org.id} 
                      value={org.id}
                      className="text-slate-300 focus:bg-slate-700 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-violet-400" />
                        <span>{org.name}</span>
                        <span className="text-slate-500">
                          #{org.account_number ?? org.slug}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PlatformCardContent>
          </PlatformCard>

          {/* Import Options or Prompt */}
          {selectedOrgId && selectedOrg ? (
            <div className="space-y-4">
              <PlatformCard variant="glass">
                <PlatformCardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <PlatformCardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-violet-400" />
                        Import Data for {selectedOrg.name}
                      </PlatformCardTitle>
                      <PlatformCardDescription>
                        Source software: {selectedOrg.source_software || 'Not specified'}
                      </PlatformCardDescription>
                    </div>
                    <PlatformBadge variant="outline">{selectedOrg.status}</PlatformBadge>
                  </div>
                </PlatformCardHeader>
                <PlatformCardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {importTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <PlatformCard 
                          key={type.value} 
                          variant="interactive"
                          className="cursor-pointer"
                        >
                          <PlatformCardHeader className="pb-2">
                            <PlatformCardTitle className="text-base flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-violet-400" />
                              {type.label}
                            </PlatformCardTitle>
                            <PlatformCardDescription className="text-xs">
                              {type.description}
                            </PlatformCardDescription>
                          </PlatformCardHeader>
                          <PlatformCardContent>
                            <PlatformButton 
                              className="w-full" 
                              size="sm"
                              onClick={() => handleStartImport(type.value)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Start Import
                            </PlatformButton>
                          </PlatformCardContent>
                        </PlatformCard>
                      );
                    })}
                  </div>
                </PlatformCardContent>
              </PlatformCard>
            </div>
          ) : (
            <Alert className="bg-slate-800/50 border-slate-700/50 text-slate-300">
              <AlertCircle className="h-4 w-4 text-violet-400" />
              <AlertDescription>
                Please select an organization above to begin the data import process.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <PlatformCardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-violet-400" />
                All Import History
              </PlatformCardTitle>
              <PlatformCardDescription>
                View and manage all data imports across organizations. Rollback available within 30 days.
              </PlatformCardDescription>
            </PlatformCardHeader>
            <PlatformCardContent>
              {loadingJobs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : importJobs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">No imports yet. Select an organization and start importing data.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {importJobs.map((job) => (
                    <ImportHistoryCard key={job.id} job={job} showRollback={true} />
                  ))}
                </div>
              )}
            </PlatformCardContent>
          </PlatformCard>
        </TabsContent>
      </Tabs>

      {/* Import Wizard Dialog */}
      {selectedOrg && (
        <DataImportWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          sourceType={selectedOrg.source_software || 'csv'}
          dataType={selectedDataType}
          organizationId={selectedOrgId}
        />
      )}
    </PlatformPageContainer>
  );
}

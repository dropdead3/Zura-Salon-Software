import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Loader2, Download, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useToast } from '@/hooks/use-toast';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface Handbook {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  file_url: string | null;
  version: string | null;
  updated_at: string;
}

interface Acknowledgment {
  handbook_id: string;
  acknowledged_at: string;
}

export default function MyHandbooks() {
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const { effectiveOrganization } = useOrganizationContext();
  const { formatDate } = useFormatDate();
  const { toast } = useToast();
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<Acknowledgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHandbook, setSelectedHandbook] = useState<Handbook | null>(null);
  const [hasReadContent, setHasReadContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (roles.length > 0 && user) {
      fetchData();
    } else if (roles.length === 0) {
      setLoading(false);
    }
  }, [roles, user]);

  const fetchData = async () => {
    // Fetch handbooks and acknowledgments in parallel
    const [handbooksResult, acknowledgementsResult] = await Promise.all([
      supabase
        .from('handbooks')
        .select('id, title, category, content, file_url, version, updated_at, visible_to_roles')
        .eq('is_active', true)
        .order('category')
        .order('title'),
      supabase
        .from('handbook_acknowledgments')
        .select('handbook_id, acknowledged_at')
    ]);

    if (handbooksResult.error) {
      console.error('Error fetching handbooks:', handbooksResult.error);
    } else {
      // Filter handbooks where visible_to_roles overlaps with user's roles
      const filteredHandbooks = (handbooksResult.data || []).filter((handbook: any) => {
        const visibleRoles = handbook.visible_to_roles || [];
        return roles.some(role => visibleRoles.includes(role));
      });
      setHandbooks(filteredHandbooks);
    }

    if (acknowledgementsResult.error) {
      console.error('Error fetching acknowledgments:', acknowledgementsResult.error);
    } else {
      setAcknowledgments(acknowledgementsResult.data || []);
    }

    setLoading(false);
  };

  const isAcknowledged = (handbookId: string) => {
    return acknowledgments.some(ack => ack.handbook_id === handbookId);
  };

  const getAcknowledgmentDate = (handbookId: string) => {
    const ack = acknowledgments.find(a => a.handbook_id === handbookId);
    return ack ? ack.acknowledged_at : null;
  };

  const handleAcknowledge = async () => {
    if (!selectedHandbook || !user) return;
    
    setSubmitting(true);
    
    const { error } = await supabase
      .from('handbook_acknowledgments')
      .insert({
        user_id: user.id,
        handbook_id: selectedHandbook.id,
        organization_id: effectiveOrganization?.id ?? null,
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      setAcknowledgments(prev => [...prev, {
        handbook_id: selectedHandbook.id,
        acknowledged_at: new Date().toISOString()
      }]);
      toast({
        title: 'Acknowledged',
        description: 'You have signed off on this handbook.'
      });
      setSelectedHandbook(null);
    }
    
    setSubmitting(false);
  };

  const openHandbook = (handbook: Handbook) => {
    setSelectedHandbook(handbook);
    setHasReadContent(false);
  };

  const acknowledgedCount = handbooks.filter(h => isAcknowledged(h.id)).length;
  const totalCount = handbooks.length;

  const groupedHandbooks = handbooks.reduce((acc, handbook) => {
    const cat = handbook.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(handbook);
    return acc;
  }, {} as Record<string, Handbook[]>);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <DashboardPageHeader
            title="My Handbooks"
            description="Review and acknowledge required training materials and team documents."
          />
        <PageExplainer pageId="my-handbooks" />
          {totalCount > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 max-w-xs bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(acknowledgedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground font-sans">
                {acknowledgedCount}/{totalCount} acknowledged
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <DashboardLoader size="lg" className="py-20" />
        ) : handbooks.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              No handbooks available for your role yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedHandbooks).map(([category, items]) => (
              <div key={category}>
                <h2 className="font-display text-sm tracking-wider text-muted-foreground mb-4">
                  {category.toUpperCase()}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map(handbook => {
                    const acknowledged = isAcknowledged(handbook.id);
                    const ackDate = getAcknowledgmentDate(handbook.id);
                    
                    return (
                      <Card 
                        key={handbook.id} 
                        className={`p-5 hover:bg-muted/50 transition-colors cursor-pointer group ${
                          acknowledged ? 'border-primary/30 bg-primary/5' : ''
                        }`}
                        onClick={() => openHandbook(handbook)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg transition-colors ${
                            acknowledged 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted group-hover:bg-background'
                          }`}>
                            {acknowledged ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <BookOpen className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-sans font-medium truncate">{handbook.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              v{handbook.version} • Updated {formatDate(new Date(handbook.updated_at), 'MMM d, yyyy')}
                            </p>
                            {acknowledged && ackDate && (
                              <p className="text-xs text-primary mt-2">
                                ✓ Acknowledged {formatDate(new Date(ackDate), 'MMM d, yyyy')}
                              </p>
                            )}
                            {!acknowledged && (
                              <p className="text-xs text-amber-500 mt-2">
                                Requires acknowledgment
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Handbook Detail Dialog */}
        <Dialog open={!!selectedHandbook} onOpenChange={(open) => !open && setSelectedHandbook(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            {selectedHandbook && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    {selectedHandbook.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Version {selectedHandbook.version} • {selectedHandbook.category || 'General'}
                  </p>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {selectedHandbook.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedHandbook.content}
                      </div>
                    </div>
                  )}

                  {selectedHandbook.file_url && (
                    <Button asChild variant="outline" className="w-full font-display">
                      <a href={selectedHandbook.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        DOWNLOAD FILE
                      </a>
                    </Button>
                  )}

                  {!selectedHandbook.content && !selectedHandbook.file_url && (
                    <p className="text-muted-foreground text-center py-8">
                      No content available for this handbook.
                    </p>
                  )}
                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                  {isAcknowledged(selectedHandbook.id) ? (
                    <div className="flex items-center gap-2 text-primary w-full justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-sans text-sm">
                        You acknowledged this on {formatDate(new Date(getAcknowledgmentDate(selectedHandbook.id)!), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="read-confirm"
                          checked={hasReadContent}
                          onCheckedChange={(checked) => setHasReadContent(checked === true)}
                        />
                        <label 
                          htmlFor="read-confirm" 
                          className="text-sm font-sans leading-tight cursor-pointer"
                        >
                          I confirm that I have read and understood the contents of this handbook.
                        </label>
                      </div>
                      <Button 
                        onClick={handleAcknowledge} 
                        disabled={!hasReadContent || submitting}
                        className="w-full font-display"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'SIGN OFF & ACKNOWLEDGE'
                        )}
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

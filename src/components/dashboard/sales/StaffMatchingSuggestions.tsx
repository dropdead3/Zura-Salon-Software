import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight, 
  Link2, 
  Sparkles, 
  X, 
  ChevronRight,
  Mail,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { usePOSProviderLabel } from '@/hooks/usePOSProviderLabel';

export interface MatchSuggestion {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  employeePhoto?: string;
  phorestStaffId: string;
  phorestStaffName: string;
  phorestStaffEmail?: string;
  phorestBranchId?: string;
  phorestBranchName?: string;
  matchReason: 'exact_name' | 'email' | 'first_last_name' | 'partial';
  confidence: 'high' | 'medium' | 'low';
}

interface StaffMatchingSuggestionsProps {
  suggestions: MatchSuggestion[];
  onLink: (suggestion: MatchSuggestion) => Promise<void>;
  onDismiss?: (suggestion: MatchSuggestion) => void;
  isLinking?: boolean;
  linkingId?: string;
  unmappedCount?: number;
}

function getMatchLabel(reason: MatchSuggestion['matchReason']): string {
  switch (reason) {
    case 'exact_name': return 'Exact name match';
    case 'email': return 'Email match';
    case 'first_last_name': return 'Name match';
    case 'partial': return 'Partial match';
    default: return 'Match';
  }
}

function getMatchIcon(reason: MatchSuggestion['matchReason']) {
  switch (reason) {
    case 'email': return <Mail className="w-3 h-3" />;
    default: return <User className="w-3 h-3" />;
  }
}

export function StaffMatchingSuggestions({ 
  suggestions, 
  onLink, 
  onDismiss,
  isLinking,
  linkingId,
  unmappedCount = 0,
}: StaffMatchingSuggestionsProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { providerLabel } = usePOSProviderLabel();

  const visibleSuggestions = suggestions.filter(
    s => !dismissed.has(`${s.employeeId}-${s.phorestStaffId}`)
  );

  if (visibleSuggestions.length === 0) return null;

  const handleDismiss = (suggestion: MatchSuggestion) => {
    setDismissed(prev => new Set([...prev, `${suggestion.employeeId}-${suggestion.phorestStaffId}`]));
    onDismiss?.(suggestion);
  };

  const handleLink = async (suggestion: MatchSuggestion) => {
    await onLink(suggestion);
  };

  const displaySuggestions = visibleSuggestions.slice(0, 3);
  const moreCount = visibleSuggestions.length - 3;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">STAFF MATCHING</CardTitle>
              <CardDescription className="text-xs">
                Link your team to {providerLabel} to track individual stats
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size={tokens.button.card} 
            className="gap-1 text-xs"
            onClick={() => navigate('/dashboard/admin/phorest-settings')}
          >
            See All
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displaySuggestions.map(suggestion => {
          const employeeInitials = suggestion.employeeName
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '?';
          
          const isCurrentlyLinking = isLinking && linkingId === suggestion.phorestStaffId;

          return (
            <div 
              key={`${suggestion.employeeId}-${suggestion.phorestStaffId}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border"
            >
              {/* Employee side */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={suggestion.employeePhoto} alt={suggestion.employeeName} />
                  <AvatarFallback className="text-xs">{employeeInitials}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate text-sm">{suggestion.employeeName}</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              {/* Phorest side */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{suggestion.phorestStaffName}</p>
                {suggestion.phorestBranchName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.phorestBranchName}
                  </p>
                )}
              </div>

              {/* Match indicator */}
              <Badge 
                variant="secondary" 
                className={cn(
                  "gap-1 text-xs shrink-0 hidden sm:flex",
                  suggestion.confidence === 'high' && "bg-chart-2/10 text-chart-2",
                  suggestion.confidence === 'medium' && "bg-chart-4/10 text-chart-4"
                )}
              >
                {suggestion.confidence === 'high' && <Sparkles className="w-3 h-3" />}
                {getMatchIcon(suggestion.matchReason)}
                <span className="hidden md:inline">{getMatchLabel(suggestion.matchReason)}</span>
              </Badge>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  size={tokens.button.inline} 
                  className="h-7 gap-1"
                  onClick={() => handleLink(suggestion)}
                  disabled={isLinking}
                >
                  {isCurrentlyLinking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Link</span>
                </Button>
                <Button 
                  size={tokens.button.inline} 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  onClick={() => handleDismiss(suggestion)}
                  disabled={isLinking}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {moreCount > 0 && (
          <Button 
            variant="ghost" 
            className="w-full text-sm text-muted-foreground"
            onClick={() => navigate('/dashboard/admin/phorest-settings')}
          >
            +{moreCount} more suggestions
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}

        {unmappedCount > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            {unmappedCount} Phorest staff member{unmappedCount !== 1 ? 's' : ''} not yet linked
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Home, Calendar, DollarSign, Pencil, Check, X, Trash2, UserMinus } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Household } from '@/hooks/useHouseholds';

interface HouseholdCardProps {
  household: Household;
  onViewClient: (client: any) => void;
  onRename: (householdId: string, name: string) => void;
  onRemoveMember: (memberId: string, householdId: string) => void;
  onDeleteHousehold: (householdId: string) => void;
  canEdit?: boolean;
}

export function HouseholdCard({
  household,
  onViewClient,
  onRename,
  onRemoveMember,
  onDeleteHousehold,
  canEdit = false,
}: HouseholdCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(household.household_name || '');

  const combinedSpend = household.members.reduce(
    (sum, m) => sum + Number(m.client?.total_spend || 0),
    0
  );
  const combinedVisits = household.members.reduce(
    (sum, m) => sum + (m.client?.visit_count || 0),
    0
  );

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(household.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <Card className="overflow-hidden border-border bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 w-48 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.heading.card}>
                  {household.household_name || 'Unnamed Household'}
                </CardTitle>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditName(household.household_name || '');
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDeleteHousehold(household.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Badge variant="outline" className="w-fit text-xs mt-1">
          {household.members.length} member{household.members.length !== 1 ? 's' : ''}
        </Badge>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {household.members.map((member) => {
            const client = member.client;
            if (!client) return null;
            const initials = client.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

            return (
              <div
                key={member.id}
                className="rounded-lg border border-border/60 p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors group relative"
                onClick={() => onViewClient(client)}
              >
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveMember(member.id, household.id);
                    }}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                )}
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="font-display text-[10px] bg-primary/10">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-medium truncate">{client.name}</p>
                    {client.email && (
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrencyWhole(Number(client.total_spend || 0))}
                  </span>
                  <span>{client.visit_count || 0} visits</span>
                  {client.last_visit && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(new Date(client.last_visit), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/50 px-6 py-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Combined: {formatCurrencyWhole(combinedSpend)}
          </span>
          <span>{combinedVisits} total visits</span>
        </div>
      </CardFooter>
    </Card>
  );
}

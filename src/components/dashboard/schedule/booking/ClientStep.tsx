import { useState, useMemo, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { PhorestClient } from './BookingWizard';
import { cn } from '@/lib/utils';
import { BannedClientBadge } from '@/components/dashboard/clients/BannedClientBadge';
import { BannedClientWarningDialog } from '@/components/dashboard/clients/BannedClientWarningDialog';

interface ExtendedPhorestClient extends PhorestClient {
  is_banned?: boolean;
  ban_reason?: string | null;
}

interface ClientStepProps {
  clients: ExtendedPhorestClient[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectClient: (client: ExtendedPhorestClient) => void;
  onNewClient: () => void;
  activeLetter?: string | null;
  onLetterChange?: (letter: string | null) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function getSortLetter(name: string): string {
  const first = getFirstName(name);
  const ch = first.charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

function AlphabetBar({
  availableLetters,
  activeLetter,
  onLetterClick,
}: {
  availableLetters: Set<string>;
  activeLetter: string | null;
  onLetterClick: (letter: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-0.5 select-none">
      {ALPHABET.map((letter) => {
        const available = availableLetters.has(letter);
        const active = activeLetter === letter;
        return (
          <button
            key={letter}
            type="button"
            onClick={() => available && onLetterClick(letter)}
            className={cn(
              'font-sans text-[11px] leading-none flex-1 min-w-0 h-7 rounded-md flex items-center justify-center transition-all duration-150',
              available
                ? active
                  ? 'text-primary bg-primary/10 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                : 'text-muted-foreground/30 pointer-events-none'
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

export function ClientStep({
  clients,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectClient,
  onNewClient,
  activeLetter: controlledLetter,
  onLetterChange,
}: ClientStepProps) {
  const [pendingBannedClient, setPendingBannedClient] = useState<ExtendedPhorestClient | null>(null);
  const [internalLetter, setInternalLetter] = useState<string | null>(null);
  const isControlled = onLetterChange !== undefined;
  const activeLetter = isControlled ? (controlledLetter ?? null) : internalLetter;
  const setActiveLetter = useCallback(
    (next: string | null) => {
      if (isControlled) onLetterChange!(next);
      else setInternalLetter(next);
    },
    [isControlled, onLetterChange]
  );
  const letterRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sort clients alphabetically by first name
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const firstA = getFirstName(a.name).toLowerCase();
      const firstB = getFirstName(b.name).toLowerCase();
      return firstA.localeCompare(firstB);
    });
  }, [clients]);

  // Filter by active letter (only when uncontrolled — controlled mode filters server-side)
  const filteredClients = useMemo(() => {
    if (isControlled || !activeLetter) return sortedClients;
    return sortedClients.filter(c => getSortLetter(c.name) === activeLetter);
  }, [sortedClients, activeLetter, isControlled]);

  // Build set of available letters (from full list, not filtered)
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const client of sortedClients) {
      letters.add(getSortLetter(client.name));
    }
    return letters;
  }, [sortedClients]);

  // Track which letters need anchor divs (first client per letter)
  const firstClientPerLetter = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of filteredClients) {
      const letter = getSortLetter(client.name);
      if (!map.has(letter)) {
        map.set(letter, client.id);
      }
    }
    return map;
  }, [filteredClients]);

  const handleLetterClick = useCallback((letter: string) => {
    setActiveLetter(prev => prev === letter ? null : letter);
  }, []);

  const setLetterRef = useCallback((letter: string, el: HTMLDivElement | null) => {
    if (el) {
      letterRefs.current.set(letter, el);
    } else {
      letterRefs.current.delete(letter);
    }
  }, []);

  const handleClientClick = (client: ExtendedPhorestClient) => {
    if (client.is_banned) {
      setPendingBannedClient(client);
    } else {
      onSelectClient(client);
    }
  };

  const handleProceedWithBanned = () => {
    if (pendingBannedClient) {
      onSelectClient(pendingBannedClient);
      setPendingBannedClient(null);
    }
  };

  const handleCancelBanned = () => {
    setPendingBannedClient(null);
  };

  const showAlphabetBar = sortedClients.length > 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar + alphabet bar */}
      <div className="border-b border-border">
        <div className="p-4 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={onNewClient}
              title="Add new client"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {showAlphabetBar && (
          <div className="px-3 pb-3">
            <AlphabetBar
              availableLetters={availableLetters}
              activeLetter={activeLetter}
              onLetterClick={handleLetterClick}
            />
            {activeLetter && (
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => setActiveLetter(null)}
                  className="font-sans text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear "{activeLetter}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Client list */}
      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  {activeLetter ? `No clients starting with "${activeLetter}"` : searchQuery ? 'No clients found' : 'Start typing to search clients'}
                </p>
                {activeLetter && <button className="text-primary text-xs mt-1 hover:underline" onClick={() => setActiveLetter(null)}>Clear filter</button>}
                <Button
                  variant="link"
                  size={tokens.button.card}
                  className="mt-2 text-primary"
                  onClick={onNewClient}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Add new client
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredClients.map((client) => {
                  const letter = getSortLetter(client.name);
                  const isFirstForLetter = firstClientPerLetter.get(letter) === client.id;

                  return (
                    <div key={client.id}>
                      {isFirstForLetter && (
                        <div
                          ref={(el) => setLetterRef(letter, el)}
                          className="px-3 pt-2 pb-1"
                        >
                          <span className="font-sans text-[11px] text-muted-foreground tracking-wide">
                            {letter}
                          </span>
                        </div>
                      )}
                      <button
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left',
                          'hover:bg-muted/70 active:bg-muted transition-colors',
                          client.is_banned && 'border border-destructive/30 bg-destructive/5'
                        )}
                        onClick={() => handleClientClick(client)}
                      >
                        <Avatar className="h-10 w-10 bg-muted">
                          <AvatarFallback className="text-xs font-medium text-muted-foreground bg-muted">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{client.name}</span>
                            {client.is_banned && <BannedClientBadge />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {formatPhone(client.phone) || client.email || 'No contact info'}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>


      {/* Banned Client Warning Dialog */}
      <BannedClientWarningDialog
        open={!!pendingBannedClient}
        onOpenChange={(open) => !open && setPendingBannedClient(null)}
        clientName={pendingBannedClient?.name || ''}
        banReason={pendingBannedClient?.ban_reason}
        onProceed={handleProceedWithBanned}
        onCancel={handleCancelBanned}
      />
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

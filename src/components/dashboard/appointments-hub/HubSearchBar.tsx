import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HubSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function HubSearchBar({ value, onChange, placeholder = 'Search by client name, email, or phone...' }: HubSearchBarProps) {
  const [local, setLocal] = useState(value);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  // Sync external changes
  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative flex-1 min-w-[240px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 bg-muted/50 border-border/60"
      />
      {local && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => { setLocal(''); onChange(''); }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

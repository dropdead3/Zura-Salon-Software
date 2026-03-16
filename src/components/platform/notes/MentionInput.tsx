import { useState, useRef, useEffect, useCallback } from 'react';
import { Crown, Shield, Headphones, Code, User } from 'lucide-react';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import { useMentionSuggestions } from '@/hooks/useAccountNotes';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const roleIcons: Record<string, React.ReactNode> = {
  platform_owner: <Crown className="h-4 w-4 text-amber-400" />,
  platform_admin: <Shield className="h-4 w-4 text-[hsl(var(--platform-primary))]" />,
  platform_support: <Headphones className="h-4 w-4 text-emerald-400" />,
  platform_developer: <Code className="h-4 w-4 text-blue-400" />,
};

export function MentionInput({ value, onChange, placeholder, className, disabled }: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const suggestions = useMentionSuggestions();
  
  const filteredSuggestions = suggestions.filter(s => 
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(position);
    
    const textBeforeCursor = newValue.slice(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasValidMentionContext = !textAfterAt.includes('\n') && textAfterAt.length < 30;
      
      if (hasValidMentionContext) {
        setSearchQuery(textAfterAt);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowDropdown(false);
  };
  
  const insertMention = useCallback((suggestion: typeof suggestions[0]) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newValue = textBeforeCursor.slice(0, lastAtIndex) + suggestion.label + ' ' + textAfterCursor;
      onChange(newValue);
      
      const newPosition = lastAtIndex + suggestion.label.length + 1;
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
        textareaRef.current?.focus();
      }, 0);
    }
    
    setShowDropdown(false);
    setSearchQuery('');
  }, [value, cursorPosition, onChange]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
      case 'Tab':
        if (filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(filteredSuggestions[selectedIndex]);
        }
        break;
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, showDropdown]);
  
  return (
    <div className="relative">
      <PlatformTextarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "resize-none min-h-[100px]",
          className
        )}
      />
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-lg border border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg-elevated))] shadow-xl"
        >
          {/* Role mentions section */}
          {filteredSuggestions.some(s => s.type === 'role') && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-[hsl(var(--platform-foreground-subtle))] uppercase tracking-wider">
                Roles
              </div>
              {filteredSuggestions
                .filter(s => s.type === 'role')
                .map((suggestion, idx) => {
                  const actualIndex = filteredSuggestions.findIndex(s => s === suggestion);
                  return (
                    <button
                      key={suggestion.id}
                      data-index={actualIndex}
                      onClick={() => insertMention(suggestion)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                        actualIndex === selectedIndex
                          ? "bg-violet-500/20 text-[hsl(var(--platform-foreground))]"
                          : "text-[hsl(var(--platform-foreground)/0.85)] hover:bg-[hsl(var(--platform-bg-card)/0.5)]"
                      )}
                    >
                      {roleIcons[suggestion.id] || <User className="h-4 w-4" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-xs text-[hsl(var(--platform-foreground-subtle))] truncate">{suggestion.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </>
          )}
          
          {/* Divider */}
          {filteredSuggestions.some(s => s.type === 'role') && 
           filteredSuggestions.some(s => s.type === 'user') && (
            <div className="border-t border-[hsl(var(--platform-border))] my-1" />
          )}
          
          {/* User mentions section */}
          {filteredSuggestions.some(s => s.type === 'user') && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-[hsl(var(--platform-foreground-subtle))] uppercase tracking-wider">
                Team Members
              </div>
              {filteredSuggestions
                .filter(s => s.type === 'user')
                .map((suggestion) => {
                  const actualIndex = filteredSuggestions.findIndex(s => s === suggestion);
                  return (
                    <button
                      key={suggestion.id}
                      data-index={actualIndex}
                      onClick={() => insertMention(suggestion)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                        actualIndex === selectedIndex
                          ? "bg-violet-500/20 text-[hsl(var(--platform-foreground))]"
                          : "text-[hsl(var(--platform-foreground)/0.85)] hover:bg-[hsl(var(--platform-bg-card)/0.5)]"
                      )}
                    >
                      <User className="h-4 w-4 text-[hsl(var(--platform-muted))]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-xs text-[hsl(var(--platform-foreground-subtle))] truncate">{suggestion.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </>
          )}
        </div>
      )}
      
      <p className="mt-1 text-xs text-[hsl(var(--platform-foreground-subtle))]">
        Type @ to mention team members or roles
      </p>
    </div>
  );
}
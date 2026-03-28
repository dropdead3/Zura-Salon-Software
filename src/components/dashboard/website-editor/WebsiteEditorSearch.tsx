import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, User, MapPin, Scissors, MessageSquareQuote, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNativeServicesForWebsite } from '@/hooks/useNativeServicesForWebsite';

// Mock testimonials (same as TestimonialsContent)
const testimonials = [
  { id: '1', title: "Love this place!", author: "Lexi V.", text: "I love this place! The owner picks literally THE BEST hair stylist..." },
  { id: '2', title: "You won't be disappointed", author: "Melissa C.", text: "The salon itself is beautiful and so unique..." },
  { id: '3', title: "Best wefts ever!!", author: "Lexi K.", text: "I have loved every product so far..." },
  { id: '4', title: "Best extensions", author: "Darian F.", text: "These extensions were so easily filled my clients hair long..." },
  { id: '5', title: "Absolutely stunning results", author: "Morgan S.", text: "I've been going here for over a year now..." },
  { id: '6', title: "Hair transformation goals", author: "Jamie L.", text: "Went from damaged, over-processed hair to the healthiest..." },
];

type SearchResult = {
  id: string;
  type: 'testimonial' | 'service' | 'stylist' | 'location';
  title: string;
  subtitle?: string;
  tab: string;
};

interface WebsiteEditorSearchProps {
  onSelectResult: (tab: string) => void;
}

export function WebsiteEditorSearch({ onSelectResult }: WebsiteEditorSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch locations
  const { data: locations = [] } = useLocations();

  // Fetch visible stylists
  const { data: stylists = [] } = useQuery({
    queryKey: ['search-stylists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('id, full_name, display_name, specialties, homepage_visible')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch services from DB
  const { categories: nativeCategories = [] } = useNativeServicesForWebsite();

  // Build searchable items
  const searchableItems = useMemo(() => {
    const items: SearchResult[] = [];

    // Add testimonials
    testimonials.forEach((t) => {
      items.push({
        id: `testimonial-${t.id}`,
        type: 'testimonial',
        title: t.title,
        subtitle: `by ${t.author}`,
        tab: 'testimonials',
      });
    });

    // Add services from native DB categories
    nativeCategories.forEach((category) => {
      category.items.forEach((service) => {
        items.push({
          id: `service-${category.categoryName}-${service.name}`,
          type: 'service',
          title: service.name,
          subtitle: category.categoryName,
          tab: 'services',
        });
      });
    });

    // Add stylists
    stylists.forEach((stylist) => {
      items.push({
        id: `stylist-${stylist.id}`,
        type: 'stylist',
        title: stylist.display_name || stylist.full_name,
        subtitle: stylist.specialties?.slice(0, 2).join(', ') || 'Stylist',
        tab: 'stylists',
      });
    });

    // Add locations
    locations.forEach((location) => {
      items.push({
        id: `location-${location.id}`,
        type: 'location',
        title: location.name,
        subtitle: `${location.city}`,
        tab: 'locations',
      });
    });

    return items;
  }, [stylists, locations, nativeCategories]);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return searchableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle?.toLowerCase().includes(lowerQuery)
    );
  }, [query, searchableItems]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      testimonial: [],
      service: [],
      stylist: [],
      location: [],
    };

    results.forEach((result) => {
      groups[result.type].push(result);
    });

    return groups;
  }, [results]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result.tab);
    setQuery('');
    setIsOpen(false);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'testimonial':
        return <MessageSquareQuote className="h-4 w-4" />;
      case 'service':
        return <Scissors className="h-4 w-4" />;
      case 'stylist':
        return <User className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'testimonial':
        return 'Testimonials';
      case 'service':
        return 'Services';
      case 'stylist':
        return 'Stylists';
      case 'location':
        return 'Locations';
    }
  };

  const hasResults = results.length > 0;
  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search all sections... ⌘K"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {hasResults ? (
            <ScrollArea className="max-h-80">
              <div className="p-2">
                {Object.entries(groupedResults).map(([type, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={type} className="mb-3 last:mb-0">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
                        {getIcon(type as SearchResult['type'])}
                        {getTypeLabel(type as SearchResult['type'])}
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="space-y-0.5">
                        {items.slice(0, 5).map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                              "hover:bg-accent transition-colors",
                              "focus:outline-none focus:bg-accent"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                        {items.length > 5 && (
                          <p className="text-xs text-muted-foreground px-3 py-1">
                            +{items.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No results found for "{query}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

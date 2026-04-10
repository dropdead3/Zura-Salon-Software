import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LocationSelect } from '@/components/ui/location-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, MapPin, Phone, Mail, Instagram, User, Calendar, Clock, Award, PartyPopper, Building2, ExternalLink, AlertTriangle, Crown, Navigation, CalendarX, Signpost, Sparkles, Copy, Check, TrendingUp, TrendingDown, Pause } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useLocations, formatHoursForDisplay, getClosedDays, getTodayHours, isClosedToday, isClosedForHoliday, type Location } from '@/hooks/useLocations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { differenceInYears, differenceInMonths, parseISO, format, setYear, isSameDay, differenceInDays, isBefore } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { getAnniversaryMilestone } from '@/hooks/useAnniversaries';
import { cn, formatFullDisplayName } from '@/lib/utils';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStrikeCounts } from '@/hooks/useStaffStrikes';
import { ResponsibilityBadges } from '@/components/access-hub/ResponsibilityBadges';
import { useRoleUtils, getIconComponent } from '@/hooks/useRoleUtils';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { getLevelColor } from '@/lib/level-colors';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useTeamLevelProgress, type TeamMemberProgress } from '@/hooks/useTeamLevelProgress';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  stylist_assistant: 'Stylist Assistant',
  admin_assistant: 'Admin Assistant',
  operations_assistant: 'Operations Assistant',
};

const roleColors: Record<string, string> = {
  super_admin: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border-amber-300 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300 dark:border-amber-700',
  admin: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  manager: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  stylist: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  receptionist: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  assistant: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  stylist_assistant: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  admin_assistant: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  operations_assistant: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
};

const rolePriority: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  manager: 2,
  stylist: 3,
  receptionist: 4,
  stylist_assistant: 5,
  admin_assistant: 6,
  operations_assistant: 7,
  assistant: 8,
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTimeAtCompany(hireDate: string | null): string {
  if (!hireDate) return '';
  const start = parseISO(hireDate);
  const years = differenceInYears(new Date(), start);
  const months = differenceInMonths(new Date(), start) % 12;
  
  if (years > 0 && months > 0) {
    return `${years}y ${months}mo`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return 'New';
}

function getAnniversaryInfo(hireDate: string | null): { isToday: boolean; isUpcoming: boolean; years: number; daysUntil: number } | null {
  if (!hireDate) return null;
  
  const start = parseISO(hireDate);
  const today = new Date();
  const thisYearAnniversary = setYear(start, today.getFullYear());
  
  // Check if today is anniversary
  if (isSameDay(thisYearAnniversary, today)) {
    const years = differenceInYears(today, start);
    if (years >= 1) {
      return { isToday: true, isUpcoming: false, years, daysUntil: 0 };
    }
  }
  
  // Check upcoming (within 7 days)
  let anniversaryDate = thisYearAnniversary;
  if (isBefore(thisYearAnniversary, today)) {
    anniversaryDate = setYear(start, today.getFullYear() + 1);
  }
  
  const daysUntil = differenceInDays(anniversaryDate, today);
  const yearsAtAnniversary = differenceInYears(anniversaryDate, start);
  
  if (daysUntil > 0 && daysUntil <= 7 && yearsAtAnniversary >= 1) {
    return { isToday: false, isUpcoming: true, years: yearsAtAnniversary, daysUntil };
  }
  
  return null;
}

export default function TeamDirectory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const { data: team = [], isLoading } = useTeamDirectory(locationFilter === 'all' ? undefined : locationFilter);
  const { data: locations = [] } = useLocations();
  const { data: currentUserProfile } = useEmployeeProfile();
  const { isViewingAsUser } = useViewAs();
  const { roles: actualRoles } = useAuth();
  
  const isSuperAdmin = currentUserProfile?.is_super_admin;
  const isAdmin = actualRoles.includes('admin') || actualRoles.includes('super_admin');
  const isManager = actualRoles.includes('manager');
  const canViewStrikes = isAdmin || isManager;
  
  // Get strike counts for all team members (only for admins/managers)
  const userIds = team.map(m => m.user_id);
  const { data: strikeCounts = {} } = useStrikeCounts(canViewStrikes ? userIds : []);
  const { data: stylistLevels } = useStylistLevels();

  // Level progression status for super admins
  const { teamProgress } = useTeamLevelProgress();
  const progressMap = useMemo(() => {
    const map = new Map<string, TeamMemberProgress>();
    if (isSuperAdmin && teamProgress) {
      teamProgress.forEach(p => map.set(p.userId, p));
    }
    return map;
  }, [isSuperAdmin, teamProgress]);

  // Get all unique roles from team members for filter dropdown
  const allRoles = [...new Set(team.flatMap(member => 
    member.is_super_admin ? ['super_admin', ...member.roles] : member.roles
  ))].sort((a, b) => (rolePriority[a] ?? 99) - (rolePriority[b] ?? 99));

  const filteredTeam = team.filter(member => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        member.full_name?.toLowerCase().includes(query) ||
        member.display_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.specialties?.some(s => s.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'super_admin') {
        if (!member.is_super_admin) return false;
      } else {
        if (!member.roles.includes(roleFilter)) return false;
      }
    }
    
    return true;
  });

  const sortByRole = (members: typeof team) => {
    return [...members].sort((a, b) => {
      const aHighestRole = Math.min(...a.roles.map(r => rolePriority[r] ?? 99));
      const bHighestRole = Math.min(...b.roles.map(r => rolePriority[r] ?? 99));
      return aHighestRole - bHighestRole;
    });
  };

  // Group team members by location - members with multiple locations appear in all their locations
  const teamByLocation = filteredTeam.reduce((acc, member) => {
    const memberLocations = member.location_ids && member.location_ids.length > 0 
      ? member.location_ids 
      : [member.location_id || 'unassigned'];
    
    memberLocations.forEach(loc => {
      const locationKey = loc || 'unassigned';
      if (!acc[locationKey]) acc[locationKey] = [];
      // Avoid duplicates
      if (!acc[locationKey].some(m => m.id === member.id)) {
        acc[locationKey].push(member);
      }
    });
    
    return acc;
  }, {} as Record<string, typeof team>);

  Object.keys(teamByLocation).forEach(loc => {
    teamByLocation[loc] = sortByRole(teamByLocation[loc]);
  });

  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.name || id;
  };

  const sortedLocationIds = Object.keys(teamByLocation).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return getLocationName(a).localeCompare(getLocationName(b));
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <DashboardPageHeader
          title="Directory"
          description="View team members and salon locations."
          className="mb-8"
        />
        <PageExplainer pageId="team-directory" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="team" className="gap-2">
              <User className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <Building2 className="w-4 h-4" />
              Locations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-6">


            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {allRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <LocationSelect
                value={locationFilter}
                onValueChange={setLocationFilter}
                triggerClassName="w-full sm:w-48"
              />
            </div>

            {isLoading ? (
              <DashboardLoader size="lg" className="py-12" />
            ) : filteredTeam.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No team members found.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {sortedLocationIds.map(locationId => {
                  const members = teamByLocation[locationId];
                  return (
                    <div key={locationId}>
                      <h2 className="text-lg font-display font-medium mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {locationId === 'unassigned' ? 'No Location Assigned' : getLocationName(locationId)}
                        <Badge variant="secondary" className="ml-2">{members.length}</Badge>
                      </h2>
                      <div className="ml-6 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {members.map(member => (
                          <TeamMemberCard 
                            key={member.id} 
                            member={member} 
                            locations={locations}
                            isSuperAdmin={isSuperAdmin}
                            canViewStrikes={canViewStrikes}
                            strikeCount={strikeCounts[member.user_id] || 0}
                            onViewProfile={() => navigate(`/dashboard/profile/${member.user_id}`)}
                            levelProgress={progressMap.get(member.user_id) || null}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {locations.filter(loc => loc.is_active).map(location => (
                <LocationCard 
                  key={location.id} 
                  location={location} 
                  teamMembers={team.filter(m => 
                    m.location_ids?.includes(location.id) || m.location_id === location.id
                  )}
                />
              ))}
            </div>
            {locations.filter(loc => loc.is_active).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No locations found.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Copyable Field Component
function CopyableField({ 
  icon, 
  value, 
  label, 
  children 
}: { 
  icon: React.ReactNode; 
  value: string; 
  label: string; 
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-start gap-3 group/copy">
      {icon}
      <div className="flex-1 min-w-0">
        {children}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded-md transition-all shrink-0",
                copied 
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                  : "opacity-0 group-hover/copy:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {copied ? 'Copied!' : `Copy ${label}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Location Card Component
interface LocationCardProps {
  location: Location;
  teamMembers: Array<{
    id: string;
    user_id: string;
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
    roles: string[];
    is_super_admin: boolean | null;
  }>;
}

function LocationCard({ location, teamMembers }: LocationCardProps) {
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const hoursDisplay = formatHoursForDisplay(location.hours_json);
  const closedDays = getClosedDays(location.hours_json);

  // Find managers and general managers for this location
  const managers = teamMembers
    .filter(m => m.roles.includes('general_manager') || m.roles.includes('manager'))
    .sort((a, b) => {
      // General managers first
      const aIsGM = a.roles.includes('general_manager') ? 0 : 1;
      const bIsGM = b.roles.includes('general_manager') ? 0 : 1;
      return aIsGM - bIsGM;
    })
    .slice(0, 4); // Max 4 manager avatars

  // Get upcoming holiday closures (next 60 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingHolidays = (location.holiday_closures || [])
    .filter(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 60;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // Show max 3 upcoming

  const getManagerRole = (member: typeof managers[0]) => {
    return member.roles.includes('general_manager') ? 'General Manager' : 'Manager';
  };

  // Determine open/closed status
  const getOpenStatus = () => {
    // Check for holiday closure first
    const holidayClosure = isClosedForHoliday(location.holiday_closures);
    if (holidayClosure) {
      return { isOpen: false, label: `Closed – ${holidayClosure.name}`, type: 'holiday' as const };
    }
    
    // Check if closed today based on regular hours
    if (isClosedToday(location.hours_json)) {
      return { isOpen: false, label: 'Closed Today', type: 'regular' as const };
    }
    
    // Check current time against today's hours
    const todayHours = getTodayHours(location.hours_json);
    if (!todayHours) {
      return { isOpen: false, label: 'Closed', type: 'regular' as const };
    }
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      // Calculate minutes until close
      const minsUntilClose = closeMinutes - currentMinutes;
      if (minsUntilClose <= 60) {
        return { isOpen: true, label: `Closes in ${minsUntilClose}m`, type: 'closing-soon' as const };
      }
      return { isOpen: true, label: 'Open', type: 'open' as const };
    }
    
    return { isOpen: false, label: 'Closed', type: 'regular' as const };
  };

  const openStatus = getOpenStatus();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="flex items-center gap-2">
              {location.store_number && (
                <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  #{location.store_number}
                </span>
              )}
              {location.name}
              <span className="text-sm font-normal text-muted-foreground">
                {location.city?.split(',')[0]?.trim()}
              </span>
            </span>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Manager Avatars */}
            {managers.length > 0 && (
              <div className="flex -space-x-2">
                {managers.map((manager, index) => (
                  <TooltipProvider key={manager.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(`/dashboard/profile/${manager.user_id}`)}
                          className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full transition-transform hover:scale-110 hover:z-10"
                          style={{ zIndex: managers.length - index }}
                        >
                          <Avatar className="w-8 h-8 border-2 border-background">
                            <AvatarImage src={manager.photo_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {(manager.display_name || manager.full_name).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-medium">{manager.display_name || manager.full_name}</p>
                        <p className="text-muted-foreground">{getManagerRole(manager)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
            
            {/* Open/Closed Status */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] font-medium gap-1",
                openStatus.isOpen 
                  ? openStatus.type === 'closing-soon'
                    ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                    : "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                  : "bg-muted text-muted-foreground border-muted-foreground/20"
              )}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                openStatus.isOpen
                  ? openStatus.type === 'closing-soon'
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                  : "bg-muted-foreground/50"
              )} />
              {openStatus.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Preview */}
        {location.google_maps_url && (
          <a
            href={location.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-36 rounded-xl overflow-hidden relative group shadow-md ring-1 ring-border/50"
          >
            {/* Gradient overlay for polish */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10 pointer-events-none" />
            
            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(location.address + ', ' + location.city)}&output=embed&z=15`}
              className="w-full h-full border-0 pointer-events-none scale-105"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${location.name}`}
            />
            
            {/* Hover overlay with CTA */}
            <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 text-xs font-medium bg-background/95 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Navigation className="w-3 h-3" />
                Open in Maps
              </span>
            </div>
            
            {/* Corner badge */}
            <div className="absolute top-2 right-2 z-20">
              <span className="text-[10px] font-medium bg-background/90 backdrop-blur-sm text-muted-foreground px-2 py-0.5 rounded-full shadow-sm">
                <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
                Preview
              </span>
            </div>
          </a>
        )}

        {/* Address */}
        <CopyableField 
          icon={<MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
          value={`${location.address}, ${location.city}`}
          label="address"
        >
          <div className="text-sm">
            <p>{location.address}</p>
            <p className="text-muted-foreground">{location.city}</p>
          </div>
        </CopyableField>

        {/* Major Crossroads */}
        {location.major_crossroads && (
          <CopyableField 
            icon={<Signpost className="w-4 h-4 text-muted-foreground shrink-0" />}
            value={location.major_crossroads}
            label="crossroads"
          >
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Crossroads:</span> {location.major_crossroads}
            </p>
          </CopyableField>
        )}

        {/* Phone */}
        {location.phone && (
          <CopyableField 
            icon={<Phone className="w-4 h-4 text-muted-foreground shrink-0" />}
            value={location.phone}
            label="phone"
          >
            <a 
              href={`tel:${location.phone}`} 
              className="text-sm hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {location.phone}
            </a>
          </CopyableField>
        )}

        {/* Hours */}
        <CopyableField 
          icon={<Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
          value={`${hoursDisplay || location.hours || 'Hours not set'}${closedDays ? ` (${closedDays})` : ''}`}
          label="hours"
        >
          <div className="text-sm space-y-1">
            {hoursDisplay ? (
              <p>{hoursDisplay}</p>
            ) : location.hours ? (
              <p>{location.hours}</p>
            ) : (
              <p className="text-muted-foreground">Hours not set</p>
            )}
            {closedDays && (
              <p className="text-muted-foreground text-xs">{closedDays}</p>
            )}
          </div>
        </CopyableField>

        {/* Upcoming Holiday Closures */}
        {upcomingHolidays.length > 0 && (
          <div className="flex items-start gap-3">
            <CalendarX className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Upcoming Closures</p>
              {upcomingHolidays.map((holiday, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {formatDate(new Date(holiday.date), 'MMM d')} — {holiday.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action Links */}
        <div className="flex gap-2 pt-2">
          {location.google_maps_url && (
            <a
              href={location.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </a>
          )}
          {location.booking_url && (
            <a
              href={location.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Book Here
            </a>
          )}
        </div>

        {/* Member Count */}
        <div className="pt-3 mt-3 border-t border-border">
          <Badge variant="secondary" className="text-xs">
            {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamMemberCardProps {
  member: {
    id: string;
    user_id: string;
    full_name: string;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    instagram: string | null;
    tiktok: string | null;
    stylist_level: string | null;
    specialties: string[] | null;
    highlighted_services: string[] | null;
    roles: string[];
    work_days: string[] | null;
    hire_date: string | null;
    location_ids: string[] | null;
    location_schedules: Record<string, string[]>;
    is_super_admin: boolean | null;
    is_primary_owner: boolean | null;
  };
  locations: Array<{ id: string; name: string }>;
  isSuperAdmin?: boolean;
  canViewStrikes?: boolean;
  strikeCount?: number;
  onViewProfile?: () => void;
  levelProgress?: TeamMemberProgress | null;
}

function TeamMemberCard({ member, locations, isSuperAdmin, canViewStrikes, strikeCount = 0, onViewProfile, levelProgress }: TeamMemberCardProps) {
  const navigate = useNavigate();
  const { getRoleIcon } = useRoleUtils();
  const { data: stylistLevels } = useStylistLevels();
  const timeAtCompany = getTimeAtCompany(member.hire_date);
  const memberLocations = member.location_ids || [];
  const hasSchedules = Object.keys(member.location_schedules).length > 0;
  const anniversaryInfo = getAnniversaryInfo(member.hire_date);
  
  const getLocationName = (id: string) => {
    return locations.find(l => l.id === id)?.name || id;
  };

  // Check if stylist level should be shown (stylists, assistants, or anyone with an assigned level)
  const isStylistOrAssistant = member.roles.includes('stylist') || member.roles.includes('stylist_assistant') || !!member.stylist_level;
  
  // Get primary role to display
  const getPrimaryRole = () => {
    if (member.is_super_admin) return { key: 'super_admin', label: roleLabels['super_admin'], color: roleColors['super_admin'] };
    const sortedRoles = [...member.roles].sort((a, b) => (rolePriority[a] ?? 99) - (rolePriority[b] ?? 99));
    const primaryRole = sortedRoles[0];
    return primaryRole ? { key: primaryRole, label: roleLabels[primaryRole] || primaryRole, color: roleColors[primaryRole] || '' } : null;
  };

  const primaryRole = getPrimaryRole();

  // Format phone number for display
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };
  
  return (
    <Card 
      className={cn(
        "group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 relative h-full",
        anniversaryInfo?.isToday && "ring-2 ring-amber-400",
        isSuperAdmin && "cursor-pointer"
      )}
      onClick={isSuperAdmin ? onViewProfile : undefined}
    >
    <CardContent className="p-5 h-full flex flex-col">
        {/* Bottom-left strike indicator - appears on hover */}
        {canViewStrikes && (
          <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/admin/incidents?tab=strikes&userId=${member.user_id}`);
                    }}
                    className={cn(
                      "p-1.5 rounded-md shadow-sm transition-all hover:scale-110",
                      strikeCount > 0
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {strikeCount > 0 
                    ? `${strikeCount} active strike${strikeCount > 1 ? 's' : ''}`
                    : 'No active strikes'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Bottom-right edit indicator - appears on hover */}
        {isSuperAdmin && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 bg-primary/90 text-primary-foreground rounded-md shadow-sm">
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">View/Edit Profile</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Main content - horizontal layout */}
        <div className="flex gap-4 flex-1">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-16 h-16 ring-2 ring-background shadow-md">
              <AvatarImage src={member.photo_url || undefined} alt={member.full_name} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-lg font-medium">
                {member.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            {anniversaryInfo?.isToday && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                <PartyPopper className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info column */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: Full name — no truncation */}
            <h3 className="font-display text-base leading-tight">
              {formatFullDisplayName(member.full_name, member.display_name)}
            </h3>

            {/* Row 2: Role badge + tenure + multi-location */}
            <div className="flex flex-wrap items-center gap-1.5">
              {member.is_primary_owner && (
                <Badge variant="outline" className="text-[10px] font-medium h-5 px-2 gap-1 bg-stone-700/90 text-amber-100 border-amber-400/30 backdrop-blur-sm">
                  <Crown className="w-3 h-3" />
                  Account Owner
                </Badge>
              )}
              {member.is_super_admin && !member.is_primary_owner && (
                <Badge variant="outline" className="text-[10px] font-medium h-5 px-2 gap-1 bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 text-amber-900 border-amber-300">
                  <Crown className="w-3 h-3" />
                  Super Admin
                </Badge>
              )}
              {primaryRole && !member.is_super_admin && (() => {
                const RoleIcon = getRoleIcon(primaryRole.key);
                return (
                  <Badge variant="outline" className={cn("text-[10px] font-medium h-5 px-2 gap-1", primaryRole.color)}>
                    <RoleIcon className="w-3 h-3" />
                    {primaryRole.label}
                  </Badge>
                );
              })()}
              <ResponsibilityBadges userId={member.user_id} size="sm" />
              {timeAtCompany && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {timeAtCompany}
                </span>
              )}
              {memberLocations.length > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-xs text-primary font-medium cursor-help">
                        <Building2 className="w-3 h-3" />
                        {memberLocations.length}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {memberLocations.map(id => getLocationName(id)).join(', ')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Row 3: Level badge + status indicator */}
            {isStylistOrAssistant && member.stylist_level && (() => {
              const levelIdx = stylistLevels?.findIndex(l => l.client_label === member.stylist_level || l.slug === member.stylist_level) ?? -1;
              const matchedLevel = levelIdx >= 0 ? stylistLevels?.[levelIdx] : null;
              const totalLevels = stylistLevels?.length ?? 1;
              const colors = levelIdx >= 0 ? getLevelColor(levelIdx, totalLevels) : { bg: 'bg-muted', text: 'text-muted-foreground' };
              const levelDisplayName = matchedLevel?.label || member.stylist_level;
              const progress = levelProgress;
              const showIndicator = isSuperAdmin && progress && !['in_progress', 'no_criteria', 'at_top_level'].includes(progress.status);
              const isStalled = isSuperAdmin && progress && progress.timeAtLevelDays >= 180 && progress.status === 'in_progress';
              return (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", colors.bg, colors.text)}>
                    <Award className="w-3 h-3" />
                    {levelIdx >= 0 ? `${levelIdx + 1} – ${levelDisplayName}` : levelDisplayName}
                  </span>
                  {showIndicator && progress.status === 'ready' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/graduation-tracker`); }}
                          >
                            <TrendingUp className="w-3 h-3" />
                            Ready
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          <p className="font-medium">Ready to Promote</p>
                          <p>Composite: {Math.round(progress.compositeScore)}%{progress.nextLevel ? ` · Next: ${progress.nextLevel.client_label}` : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {showIndicator && progress.status === 'needs_attention' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/graduation-tracker`); }}
                          >
                            <TrendingDown className="w-3 h-3" />
                            Attention
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          <p className="font-medium">Needs Attention</p>
                          <p>Composite: {Math.round(progress.compositeScore)}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {showIndicator && progress.status === 'at_risk' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/graduation-tracker`); }}
                          >
                            <TrendingDown className="w-3 h-3" />
                            At Risk
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          <p className="font-medium">At Risk — Grace Period</p>
                          <p>{progress.retentionFailures.map(f => f.label).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {showIndicator && progress.status === 'below_standard' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/graduation-tracker`); }}
                          >
                            <TrendingDown className="w-3 h-3" />
                            Below Std
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          <p className="font-medium">Below Standard — Demotion Eligible</p>
                          <p>{progress.retentionFailures.map(f => f.label).join(', ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isStalled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/graduation-tracker`); }}
                          >
                            <Pause className="w-3 h-3" />
                            Stalled
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                          <p className="font-medium">Stalled Progression</p>
                          <p>No level change in {Math.round(progress!.timeAtLevelDays / 30)} months</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })()}

            {/* Row 4: Phone */}
            {member.phone && (
              <a 
                href={`tel:${member.phone}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3" />
                {formatPhone(member.phone)}
              </a>
            )}

            {/* Row 5: Contact icons + calendar */}
            <div className="flex items-center justify-between mt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                {member.email && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={`mailto:${member.email}`}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs max-w-48 truncate">{member.email}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {member.instagram && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={`https://instagram.com/${member.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">{member.instagram}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {hasSchedules && (
                <HoverCard openDelay={100} closeDelay={50}>
                  <HoverCardTrigger asChild>
                    <button 
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors opacity-60 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="left" align="start" className="w-56 p-3 z-50">
                    <p className="text-xs font-medium mb-2">Schedule</p>
                    <div className="space-y-2">
                      {memberLocations.map(locId => {
                        const schedule = member.location_schedules[locId] || [];
                        return (
                          <div key={locId}>
                            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {getLocationName(locId)}
                            </p>
                            <div className="flex gap-0.5">
                              {DAYS_OF_WEEK.map(day => (
                                <span
                                  key={day}
                                  className={cn(
                                    "text-[10px] w-5 h-5 flex items-center justify-center rounded font-medium",
                                    schedule.includes(day)
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted/50 text-muted-foreground/40'
                                  )}
                                >
                                  {day.charAt(0)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </div>
        </div>
        
        {/* Specialty Badges - Always at bottom, only for stylists and stylist assistants */}
        <div className="min-h-[36px] mt-auto">
          {isStylistOrAssistant && member.specialties && member.specialties.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 pt-2.5 border-t border-border/50">
              {member.specialties.slice(0, 4).map((specialty) => {
                const isHighlighted = member.highlighted_services?.includes(specialty);
                
                return (
                  <Badge
                    key={specialty}
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium h-5 px-1.5 gap-0.5 normal-case",
                      isHighlighted
                        ? "bg-primary/5 text-primary border-primary/30"
                        : "bg-muted/50 text-muted-foreground border-border"
                    )}
                  >
                    {isHighlighted && (
                      <Sparkles className="w-2.5 h-2.5" />
                    )}
                    {specialty.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </Badge>
                );
              })}
              {member.specialties.length > 4 && (
                <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 bg-muted/30 text-muted-foreground normal-case">
                  +{member.specialties.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

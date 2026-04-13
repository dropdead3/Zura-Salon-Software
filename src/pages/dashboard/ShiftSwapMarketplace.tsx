import { useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SwapCard } from '@/components/shifts/SwapCard';
import { PostSwapDialog } from '@/components/shifts/PostSwapDialog';
import { ClaimSwapDialog } from '@/components/shifts/ClaimSwapDialog';
import { MySwapsPanel } from '@/components/shifts/MySwapsPanel';
import { LocationSelect } from '@/components/ui/location-select';
import { 
  Plus, ArrowLeftRight, Filter, RefreshCw, 
  ArrowLeft, CalendarDays 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShiftSwaps, useMySwaps, type ShiftSwap } from '@/hooks/useShiftSwaps';
import { useAuth } from '@/contexts/AuthContext';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function ShiftSwapMarketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwap | null>(null);
  
  // Filters
  const [swapTypeFilter, setSwapTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const { data: swaps = [], isLoading, refetch } = useShiftSwaps();
  const { data: mySwaps } = useMySwaps();

  // Filter swaps
  const filteredSwaps = swaps.filter(swap => {
    // Exclude user's own requests
    if (swap.requester_id === user?.id) return false;
    
    if (swapTypeFilter !== 'all' && swap.swap_type !== swapTypeFilter) return false;
    if (locationFilter !== 'all' && swap.location_id !== locationFilter) return false;
    
    return true;
  });

  const myRequestCount = mySwaps?.requested?.filter(
    s => !['approved', 'denied', 'cancelled', 'expired'].includes(s.status)
  ).length || 0;
  
  const myClaimCount = mySwaps?.claimed?.filter(
    s => !['approved', 'denied', 'cancelled', 'expired'].includes(s.status)
  ).length || 0;

  const handleClaimClick = (swap: ShiftSwap) => {
    setSelectedSwap(swap);
    setClaimDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <DashboardPageHeader
          title="Shift Swap Marketplace"
          description="Trade, cover, or give away shifts with your team"
          backTo={dashPath('/schedule')}
          backLabel="Back to Schedule"
          className="mb-6"
          actions={
            <Button onClick={() => setPostDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
        <PageExplainer pageId="shift-swaps" />
              Post a Shift
            </Button>
          }
        />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Available Swaps */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <TabsList>
                  <TabsTrigger value="available" className="gap-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    Available
                    {filteredSwaps.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filteredSwaps.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="my-swaps" className="gap-2">
                    <CalendarDays className="w-4 h-4" />
                    My Swaps
                    {(myRequestCount + myClaimCount) > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {myRequestCount + myClaimCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'available' && (
                  <div className="flex items-center gap-2">
                    <Select value={swapTypeFilter} onValueChange={setSwapTypeFilter}>
                      <SelectTrigger className="w-[130px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="swap">Swaps</SelectItem>
                        <SelectItem value="cover">Covers</SelectItem>
                        <SelectItem value="giveaway">Giveaways</SelectItem>
                      </SelectContent>
                    </Select>
                    <LocationSelect
                      value={locationFilter}
                      onValueChange={setLocationFilter}
                      allLabel="All Locations"
                      triggerClassName="w-[150px]"
                    />
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="available" className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredSwaps.length > 0 ? (
                  <motion.div 
                    className="grid gap-4 sm:grid-cols-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.05 } }
                    }}
                  >
                    {filteredSwaps.map((swap) => (
                      <SwapCard
                        key={swap.id}
                        swap={swap}
                        onClaim={() => handleClaimClick(swap)}
                        isOwner={swap.requester_id === user?.id}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <Card className="p-12 text-center">
                    <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No shifts available</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Be the first to post a shift for your team!
                    </p>
                    <Button onClick={() => setPostDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Post a Shift
                    </Button>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="my-swaps" className="mt-4">
                <MySwapsPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Quick Stats & Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Your Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Requests</span>
                  <Badge variant="secondary">{myRequestCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Claims</span>
                  <Badge variant="secondary">{myClaimCount}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">1</span>
                  </div>
                  <p>Post a shift you need covered or want to trade</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">2</span>
                  </div>
                  <p>Teammates browse and claim available shifts</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">3</span>
                  </div>
                  <p>A manager reviews and approves the swap</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">4</span>
                  </div>
                  <p>Both parties get notified and schedules update</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <PostSwapDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} />
        <ClaimSwapDialog 
          open={claimDialogOpen} 
          onOpenChange={setClaimDialogOpen} 
          swap={selectedSwap}
        />
      </div>
    </DashboardLayout>
  );
}

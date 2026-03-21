import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, FileText } from 'lucide-react';
import { HuddleEditor } from '@/components/huddle/HuddleEditor';
import { HuddleArchive } from '@/components/huddle/HuddleArchive';
import { useTodaysHuddle, useHuddleById } from '@/hooks/useHuddles';
import { useFormatDate } from '@/hooks/useFormatDate';

export default function DailyHuddle() {
  const { formatDate } = useFormatDate();
  const [activeTab, setActiveTab] = useState('today');
  const [selectedHuddleId, setSelectedHuddleId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const { data: todaysHuddle, refetch: refetchToday } = useTodaysHuddle();
  const { data: selectedHuddle } = useHuddleById(selectedHuddleId || undefined);

  const handleArchiveSelect = (huddleId: string) => {
    setSelectedHuddleId(huddleId);
    setActiveTab('edit');
  };

  const handleSaved = () => {
    refetchToday();
    if (activeTab === 'edit') {
      setActiveTab('today');
      setSelectedHuddleId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Daily Huddle"
          description="Create and manage daily team huddle notes"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="today" className="gap-2">
              <Edit className="w-4 h-4" />
              Today ({formatDate(new Date(), 'MMM d')})
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Calendar className="w-4 h-4" />
              Archive
            </TabsTrigger>
            {selectedHuddleId && (
              <TabsTrigger value="edit" className="gap-2">
                <FileText className="w-4 h-4" />
                Edit Past Huddle
              </TabsTrigger>
            )}
          </TabsList>

          {/* Today's Huddle */}
          <TabsContent value="today" className="mt-6">
            <HuddleEditor
              existingHuddle={todaysHuddle}
              date={today}
              onSaved={handleSaved}
            />
          </TabsContent>

          {/* Archive */}
          <TabsContent value="archive" className="mt-6">
            <HuddleArchive onSelect={handleArchiveSelect} />
          </TabsContent>

          {/* Edit Past Huddle */}
          <TabsContent value="edit" className="mt-6">
            {selectedHuddle && (
              <HuddleEditor
                existingHuddle={selectedHuddle}
                date={selectedHuddle.huddle_date}
                onSaved={handleSaved}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Video, UserPlus, BarChart3, HelpCircle } from 'lucide-react';
import { VideoLibraryManager } from '@/components/training/VideoLibraryManager';
import { IndividualAssignments } from '@/components/training/IndividualAssignments';
import { TeamProgressDashboard } from '@/components/training/TeamProgressDashboard';
import { TrainingQuizManager } from '@/components/training/TrainingQuizManager';

export default function TrainingHub() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Training Hub"
          description="Manage training library, assignments, quizzes, and track team progress"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <ResponsiveTabsList onTabChange={setActiveTab}>
            <TabsTrigger value="library" className="gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="library" className="mt-6">
            <VideoLibraryManager />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <IndividualAssignments />
          </TabsContent>

          <TabsContent value="quizzes" className="mt-6">
            <TrainingQuizManager />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <TeamProgressDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

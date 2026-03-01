import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { CreateChallengeWizard } from '@/components/challenges/CreateChallengeWizard';
import { 
  ArrowLeft, Plus, Trophy, Target, Users, 
  Play, Square, Trash2, Loader2 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  useChallenges, 
  useUpdateChallenge, 
  useDeleteChallenge,
  type TeamChallenge 
} from '@/hooks/useChallenges';

export default function ChallengesDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<TeamChallenge | null>(null);

  const { data: challenges = [], isLoading } = useChallenges();
  const updateChallenge = useUpdateChallenge();
  const deleteChallenge = useDeleteChallenge();

  // Filter challenges by status
  const filteredChallenges = activeTab === 'all' 
    ? challenges 
    : challenges.filter(c => c.status === activeTab);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const draftChallenges = challenges.filter(c => c.status === 'draft');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  const handleStartChallenge = async (challenge: TeamChallenge) => {
    await updateChallenge.mutateAsync({
      id: challenge.id,
      updates: { status: 'active' },
    });
  };

  const handleEndChallenge = async (challenge: TeamChallenge) => {
    await updateChallenge.mutateAsync({
      id: challenge.id,
      updates: { status: 'completed' },
    });
  };

  const handleDeleteChallenge = async () => {
    if (!selectedChallenge) return;
    await deleteChallenge.mutateAsync(selectedChallenge.id);
    setDeleteConfirmOpen(false);
    setSelectedChallenge(null);
  };

  const handleViewChallenge = (challenge: TeamChallenge) => {
    navigate(`/dashboard/admin/challenges/${challenge.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <DashboardPageHeader
          title="Team Challenges"
          description="Create and manage team competitions"
          className="mb-6"
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Challenge
            </Button>
          }
        />

        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display">{challenges.length}</p>
                  <p className="text-xs text-muted-foreground">Total Challenges</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-display">{activeChallenges.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-display">{draftChallenges.length}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-display">{completedChallenges.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Challenges Grid */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {challenges.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              {activeChallenges.length > 0 && (
                <Badge className="ml-2 bg-green-500 text-white">
                  {activeChallenges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft
              {draftChallenges.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {draftChallenges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredChallenges.length > 0 ? (
              <motion.div 
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
              >
                {filteredChallenges.map((challenge) => (
                  <div key={challenge.id} className="relative group">
                    <ChallengeCard
                      challenge={challenge}
                      onView={() => handleViewChallenge(challenge)}
                    />
                    
                    {/* Quick actions overlay */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {challenge.status === 'draft' && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartChallenge(challenge);
                          }}
                          disabled={updateChallenge.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {challenge.status === 'active' && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndChallenge(challenge);
                          }}
                          disabled={updateChallenge.isPending}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChallenge(challenge);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <Card className="p-12 text-center">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No challenges yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first team challenge to get started
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Challenge
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Challenge Dialog */}
        <CreateChallengeWizard 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Challenge</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedChallenge?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChallenge}
                disabled={deleteChallenge.isPending}
              >
                {deleteChallenge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

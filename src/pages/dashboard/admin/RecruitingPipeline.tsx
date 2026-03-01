import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { 
  useJobApplications, 
  usePipelineStages, 
  useUpdateApplication,
  JobApplication 
} from "@/hooks/useJobApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Star, 
  StarOff, 
  MoreVertical, 
  Mail, 
  Phone, 
  Instagram,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Clock,
  Archive,
  ChevronRight,
  Loader2,
  Briefcase,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { tokens } from '@/lib/design-tokens';
import { ApplicantDetailSheet } from "@/components/dashboard/ApplicantDetailSheet";
import { BentoGrid } from '@/components/ui/bento-grid';

export default function RecruitingPipeline() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplication | null>(null);

  const { data: applications = [], isLoading } = useJobApplications(showArchived);
  const { data: stages = [] } = usePipelineStages();
  const updateApplication = useUpdateApplication();

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchQuery === "" ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.specialties.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage =
        selectedStage === "all" || app.pipeline_stage === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [applications, searchQuery, selectedStage]);

  const stats = useMemo(() => {
    const total = applications.length;
    const newCount = applications.filter((a) => a.pipeline_stage === "new").length;
    const inProgress = applications.filter((a) => 
      !["new", "hired", "rejected", "not-interested"].includes(a.pipeline_stage)
    ).length;
    const hired = applications.filter((a) => a.pipeline_stage === "hired").length;
    const thisWeek = applications.filter((a) => {
      const created = new Date(a.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length;

    return { total, newCount, inProgress, hired, thisWeek };
  }, [applications]);

  const handleStageChange = (applicationId: string, newStage: string) => {
    updateApplication.mutate({ id: applicationId, updates: { pipeline_stage: newStage } });
  };

  const handleToggleStar = (app: JobApplication) => {
    updateApplication.mutate({ id: app.id, updates: { is_starred: !app.is_starred } });
  };

  const handleArchive = (applicationId: string) => {
    updateApplication.mutate({ id: applicationId, updates: { is_archived: true } });
  };

  const getStageColor = (stageSlug: string) => {
    const stage = stages.find((s) => s.slug === stageSlug);
    return stage?.color || "#6b7280";
  };

  const getStageName = (stageSlug: string) => {
    const stage = stages.find((s) => s.slug === stageSlug);
    return stage?.name || stageSlug;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 md:px-8 py-6">
        {/* Header */}
        <DashboardPageHeader
          title="Recruiting Pipeline"
          description="Track and manage job applicants"
          className="mb-6"
        />

        {/* Stats Cards */}
        <BentoGrid maxPerRow={5} gap="gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-indigo-500/10">
                  <Clock className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.newCount}</p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <UserCheck className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.hired}</p>
                  <p className="text-xs text-muted-foreground">Hired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.thisWeek}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </BentoGrid>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.slug} value={stage.slug}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: stage.color }} 
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showArchived ? "secondary" : "outline"}
                  size={tokens.button.card}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Applicants ({filteredApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No applicants found</p>
                <p className="text-sm">Applications from your website forms will appear here</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      app.is_archived && "opacity-60"
                    )}
                    onClick={() => setSelectedApplicant(app)}
                  >
                    {/* Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(app);
                      }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {app.is_starred ? (
                        <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                      ) : (
                        <StarOff className="h-5 w-5" />
                      )}
                    </button>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {app.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{app.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{app.email}</p>
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="hidden md:block text-sm text-muted-foreground w-24">
                      {app.experience} yrs
                    </div>

                    {/* Specialties */}
                    <div className="hidden lg:block text-sm text-muted-foreground w-48 truncate">
                      {app.specialties}
                    </div>

                    {/* Stage Badge */}
                    <Badge
                      variant="outline"
                      className="shrink-0"
                      style={{
                        borderColor: getStageColor(app.pipeline_stage),
                        color: getStageColor(app.pipeline_stage),
                      }}
                    >
                      {getStageName(app.pipeline_stage)}
                    </Badge>

                    {/* Date */}
                    <div className="hidden sm:block text-xs text-muted-foreground w-24 text-right">
                      {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`mailto:${app.email}`)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`tel:${app.phone}`)}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </DropdownMenuItem>
                        {app.instagram && (
                          <DropdownMenuItem 
                            onClick={() => window.open(`https://instagram.com/${app.instagram.replace("@", "")}`, "_blank")}
                          >
                            <Instagram className="h-4 w-4 mr-2" />
                            View Instagram
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {stages.map((stage) => (
                          <DropdownMenuItem
                            key={stage.slug}
                            onClick={() => handleStageChange(app.id, stage.slug)}
                            disabled={app.pipeline_stage === stage.slug}
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-2" 
                              style={{ backgroundColor: stage.color }} 
                            />
                            Move to {stage.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => navigate(`/dashboard/admin/new-hire?name=${encodeURIComponent(app.name)}&email=${encodeURIComponent(app.email)}&applicantId=${app.id}`)}
                          className="text-emerald-600"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Hire & Onboard
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleArchive(app.id)}
                          className="text-destructive"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <ApplicantDetailSheet
        applicant={selectedApplicant}
        onClose={() => setSelectedApplicant(null)}
        stages={stages}
        onStageChange={handleStageChange}
        onToggleStar={handleToggleStar}
      />
    </DashboardLayout>
  );
}

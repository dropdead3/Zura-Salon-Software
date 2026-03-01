import { useState } from "react";
import { PremiumFloatingPanel } from "@/components/ui/premium-floating-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  StarOff,
  Mail,
  Phone,
  Instagram,
  Calendar,
  Briefcase,
  Users,
  MessageSquare,
  Send,
  Clock,
  Sparkles,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  JobApplication, 
  PipelineStage,
  useApplicationNotes,
  useAddApplicationNote
} from "@/hooks/useJobApplications";
import { cn } from "@/lib/utils";

interface ApplicantDetailSheetProps {
  applicant: JobApplication | null;
  onClose: () => void;
  stages: PipelineStage[];
  onStageChange: (applicationId: string, newStage: string) => void;
  onToggleStar: (app: JobApplication) => void;
}

export function ApplicantDetailSheet({
  applicant,
  onClose,
  stages,
  onStageChange,
  onToggleStar,
}: ApplicantDetailSheetProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes = [] } = useApplicationNotes(applicant?.id || "");
  const addNote = useAddApplicationNote();

  const handleAddNote = () => {
    if (!applicant || !newNote.trim()) return;
    addNote.mutate(
      { applicationId: applicant.id, note: newNote.trim() },
      { onSuccess: () => setNewNote("") }
    );
  };

  const getStageColor = (stageSlug: string) => {
    const stage = stages.find((s) => s.slug === stageSlug);
    return stage?.color || "#6b7280";
  };

  if (!applicant) return null;

  return (
    <PremiumFloatingPanel open={!!applicant} onOpenChange={() => onClose()} maxWidth="520px">
      <div className="p-5 pb-4 border-b border-border/40">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {applicant.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm tracking-wide uppercase">{applicant.name}</h2>
              <button
                onClick={() => onToggleStar(applicant)}
                className="text-muted-foreground hover:text-amber-500 transition-colors"
              >
                {applicant.is_starred ? (
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                ) : (
                  <StarOff className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{applicant.email}</p>
          </div>
        </div>

        {/* Stage Selector */}
        <div className="mt-4">
          <Select
            value={applicant.pipeline_stage}
            onValueChange={(value) => onStageChange(applicant.id, value)}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStageColor(applicant.pipeline_stage) }}
                />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
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
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Contact
            </h3>
            <div className="space-y-2">
              <a
                href={`mailto:${applicant.email}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{applicant.email}</span>
              </a>
              <a
                href={`tel:${applicant.phone}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{applicant.phone}</span>
              </a>
              {applicant.instagram && (
                <a
                  href={`https://instagram.com/${applicant.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{applicant.instagram}</span>
                </a>
              )}
            </div>
          </div>

          <Separator />

          {/* Application Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Application Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{applicant.experience} experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{applicant.client_book} clients</span>
              </div>
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Applied {format(new Date(applicant.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Specialties */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Specialties
            </h3>
            <p className="text-sm">{applicant.specialties}</p>
          </div>

          <Separator />

          {/* Why Us */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Why Us?
            </h3>
            <p className="text-sm">{applicant.why_join_us}</p>
          </div>

          {applicant.message && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Additional Message
                </h3>
                <p className="text-sm">{applicant.message}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes ({notes.length})
            </h3>

            {/* Add Note */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note about this applicant..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Add Note
            </Button>

            {/* Notes List */}
            {notes.length > 0 && (
              <div className="space-y-3 mt-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-muted/50 rounded-lg p-3 space-y-2"
                  >
                    <p className="text-sm">{note.note}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </PremiumFloatingPanel>
  );
}

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Send, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useMeetingNotes, type MeetingNote } from '@/hooks/useMeetingNotes';
import { useMeetingAccountabilityItems, type AccountabilityItem } from '@/hooks/useAccountabilityItems';
import { useMeetingReports, useCreateMeetingReport, useSendMeetingReport } from '@/hooks/useMeetingReports';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { useStaffComplianceSummary } from '@/hooks/color-bar/useStaffComplianceSummary';
import { format, subDays } from 'date-fns';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { useResolveCommission } from '@/hooks/useResolveCommission';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useLevelUpliftEstimate } from '@/hooks/useLevelUpliftEstimate';
import { useIndividualStaffReport } from '@/hooks/useIndividualStaffReport';

interface ReportBuilderProps {
  meetingId: string;
  teamMemberId: string;
  teamMemberName: string;
}

export function ReportBuilder({ meetingId, teamMemberId, teamMemberName }: ReportBuilderProps) {
  const { formatDate } = useFormatDate();
  const { data: notes } = useMeetingNotes(meetingId);
  const { data: items } = useMeetingAccountabilityItems(meetingId);
  const { data: reports } = useMeetingReports(meetingId);
  const createReport = useCreateMeetingReport();
  const sendReport = useSendMeetingReport();

  // Compliance data for the trailing 30 days
  const complianceDateTo = format(new Date(), 'yyyy-MM-dd');
  const complianceDateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const { data: complianceData } = useStaffComplianceSummary(teamMemberId, complianceDateFrom, complianceDateTo);

  // Level progress data
  const levelProgress = useLevelProgress(teamMemberId);
  const { resolveCommission } = useResolveCommission();
  const { data: allLevels = [] } = useStylistLevels();

  // Service-price-aware uplift
  const currentResolved = (levelProgress?.nextLevelLabel && teamMemberId) ? resolveCommission(teamMemberId, 1000, 0) : null;
  const nextLevelObjReport = allLevels.find(l => l.id === levelProgress?.nextLevelId);
  const upliftEstimate = useLevelUpliftEstimate({
    userId: teamMemberId,
    currentLevelId: levelProgress?.currentLevelId,
    nextLevelId: levelProgress?.nextLevelId ?? undefined,
    currentCommRate: currentResolved?.serviceRate ?? 0,
    nextCommRate: nextLevelObjReport?.service_commission_rate ?? 0,
    evaluationWindowDays: levelProgress?.evaluationWindowDays || 30,
  });

  const [isBuilding, setIsBuilding] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [includeLevelProgress, setIncludeLevelProgress] = useState(true);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [additionalContent, setAdditionalContent] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Performance data for the trailing 30 days
  const perfDateTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const perfDateFrom = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);
  const { data: perfData } = useIndividualStaffReport(teamMemberId, perfDateFrom, perfDateTo);

  // Filter only non-private notes for report
  const shareableNotes = notes?.filter(n => !n.is_private) || [];
  const activeItems = items?.filter(i => i.status !== 'cancelled') || [];

  const generateReportContent = () => {
    let content = `# Check-in Report\n\n`;
    content += `**Meeting Date:** ${formatDate(new Date(), 'MMMM d, yyyy')}\n`;
    content += `**Team Member:** ${teamMemberName}\n\n`;

    if (selectedNotes.length > 0) {
      content += `## Meeting Notes\n\n`;
      selectedNotes.forEach(noteId => {
        const note = shareableNotes.find(n => n.id === noteId);
        if (note) {
          content += `### ${note.topic_category.charAt(0).toUpperCase() + note.topic_category.slice(1)}\n`;
          content += `${note.content}\n\n`;
        }
      });
    }

    if (selectedItems.length > 0) {
      content += `## Action Items\n\n`;
      selectedItems.forEach(itemId => {
        const item = activeItems.find(i => i.id === itemId);
        if (item) {
          const status = item.status === 'completed' ? '✅' : item.status === 'in_progress' ? '🔄' : '⏳';
          content += `- ${status} **${item.title}**`;
          if (item.due_date) {
            content += ` (Due: ${formatDate(new Date(item.due_date), 'MMM d')})`;
          }
          content += '\n';
          if (item.description) {
            content += `  - ${item.description}\n`;
          }
        }
      });
      content += '\n';
    }

    if (additionalContent.trim()) {
      content += `## Additional Notes\n\n${additionalContent}\n\n`;
    }

    // Performance Summary section
    if (includePerformance && perfData) {
      const { revenue, productivity, clientMetrics, retail, experienceScore, teamAverages, commission } = perfData;
      const tipRate = experienceScore.tipRate;
      content += `## Performance Summary (Last 30 Days)\n\n`;
      content += `| Metric | Value | Team Avg |\n`;
      content += `|--------|-------|----------|\n`;
      content += `| Revenue | $${Math.round(revenue.total).toLocaleString()} | $${Math.round(teamAverages.revenue).toLocaleString()} |\n`;
      content += `| Avg Ticket | $${Math.round(revenue.avgTicket).toLocaleString()} | $${Math.round(teamAverages.avgTicket).toLocaleString()} |\n`;
      content += `| Appointments | ${productivity.completed} | ${Math.round(teamAverages.appointments)} |\n`;
      content += `| Tip Rate | ${tipRate.toFixed(1)}% | — |\n`;
      content += `| Rebook Rate | ${clientMetrics.rebookingRate.toFixed(0)}% | ${teamAverages.rebookingRate.toFixed(0)}% |\n`;
      content += `| Retention | ${clientMetrics.retentionRate.toFixed(0)}% | ${teamAverages.retentionRate.toFixed(0)}% |\n`;
      content += `| Retail Attachment | ${retail.attachmentRate}% | — |\n`;
      content += `| Experience Score | ${experienceScore.composite} (${experienceScore.status}) | — |\n`;
      content += `| Commission | $${Math.round(commission.totalCommission).toLocaleString()} (${commission.tierName}) | — |\n`;
      content += '\n';
      if (revenue.revenueChange !== 0) {
        const dir = revenue.revenueChange > 0 ? '📈' : '📉';
        content += `${dir} Revenue ${revenue.revenueChange > 0 ? 'up' : 'down'} ${Math.abs(Math.round(revenue.revenueChange))}% vs prior period\n\n`;
      }
    }

    // Color Bar Performance section (renamed from Compliance)
    if (includeCompliance && complianceData && complianceData.totalColorAppointments > 0) {
      content += `## Color Bar Performance (Last 30 Days)\n\n`;
      content += `- **Reweigh Rate:** ${complianceData.complianceRate}%\n`;
      content += `- **Color Appointments:** ${complianceData.totalColorAppointments}\n`;
      content += `- **Tracked Sessions:** ${complianceData.tracked}\n`;
      content += `- **Missed Sessions:** ${complianceData.missed}\n`;
      content += `- **Bowl Reweigh Rate:** ${complianceData.reweighRate}%\n`;

      // Waste metrics
      if (complianceData.wasteQty > 0 || complianceData.wasteCost > 0) {
        content += `\n### Waste Metrics\n\n`;
        content += `- **Waste Rate:** ${complianceData.wastePct}%\n`;
        content += `- **Est. Waste Cost:** $${complianceData.wasteCost.toFixed(2)}\n`;
        content += `- **Waste Quantity:** ${complianceData.wasteQty}g\n`;
      }

      // Overage attachment
      if (complianceData.overageChargeTotal > 0 || complianceData.overageAttachmentRate > 0) {
        content += `\n### Overage & Product Charges\n\n`;
        content += `- **Overage Attachment Rate:** ${complianceData.overageAttachmentRate}%\n`;
        content += `- **Total Overage Charges:** $${complianceData.overageChargeTotal.toFixed(2)}\n`;
      }

      if (complianceData.missedAppointments.length > 0) {
        content += `\n### Recent Missed Sessions\n\n`;
        complianceData.missedAppointments.forEach((m) => {
          content += `- ${m.date} — ${m.serviceName}\n`;
        });
      }

      // Coaching callouts
      const callouts: string[] = [];
      if (complianceData.complianceRate < 90) {
        callouts.push('Reweigh rate is below 90%. Review color bar habits and ensure all color services are tracked through Zura Color Bar.');
      }
      if (complianceData.wastePct > 15) {
        callouts.push(`Waste rate is ${complianceData.wastePct}% — above the 15% threshold. Consider reviewing dispensing habits and mixing accuracy.`);
      }

      if (callouts.length > 0) {
        content += `\n### Coaching Notes\n\n`;
        callouts.forEach((c) => {
          content += `> ⚠️ ${c}\n\n`;
        });
      }
      content += '\n';
    }

    // Level Progress section
    if (includeLevelProgress && levelProgress) {
      content += `## Level Progress\n\n`;
      if (levelProgress.nextLevelLabel) {
        content += `**Current Level:** ${levelProgress.currentLevelLabel}\n`;
        content += `**Next Level:** ${levelProgress.nextLevelLabel}\n`;
        content += `**Overall Readiness:** ${levelProgress.compositeScore}%${levelProgress.isFullyQualified ? ' ✅ Qualified' : ''}\n\n`;

        if (levelProgress.criteriaProgress.length > 0) {
          content += `### Criteria Breakdown\n\n`;
          content += `| Metric | Current | Target | Progress |\n`;
          content += `|--------|---------|--------|----------|\n`;
          levelProgress.criteriaProgress.forEach(cp => {
            const formatVal = (val: number) => {
              if (cp.unit === '/mo' || cp.unit === '$') return `$${val.toLocaleString()}`;
              if (cp.unit === '%') return `${val.toFixed(1)}%`;
              if (cp.unit === 'd') return `${val}d`;
              return String(val);
            };
            const statusIcon = cp.percent >= 100 ? '✅' : cp.percent >= 75 ? '🔶' : '🔴';
            content += `| ${cp.label} | ${formatVal(cp.current)} | ${formatVal(cp.target)} | ${statusIcon} ${Math.round(cp.percent)}% |\n`;
          });
          content += '\n';

          // Highlight gaps
          const gaps = levelProgress.criteriaProgress.filter(cp => cp.gap > 0);
          if (gaps.length > 0) {
            content += `### Focus Areas\n\n`;
            gaps.forEach(cp => {
              const formatVal = (val: number) => {
                if (cp.unit === '/mo' || cp.unit === '$') return `$${Math.round(val).toLocaleString()}`;
                if (cp.unit === '%') return `${val.toFixed(1)}%`;
                return String(Math.round(val));
              };
              content += `- **${cp.label}**: ${formatVal(cp.gap)} more needed to reach target\n`;
            });
            content += '\n';
          }
        }

        // Commission uplift estimate
        const currentResolved = resolveCommission(teamMemberId, 1000, 0);
        const nextLevelObj = allLevels.find(l => l.id === levelProgress.nextLevelId);
        if (nextLevelObj && currentResolved) {
          const currentSvcRate = currentResolved.serviceRate;
          const nextSvcRate = nextLevelObj.service_commission_rate ?? 0;
          if (nextSvcRate > currentSvcRate) {
            const monthlyRevenue = levelProgress.criteriaProgress.find(cp => cp.key === 'revenue')?.current || 0;
            const monthlyUplift = monthlyRevenue * (nextSvcRate - currentSvcRate);
            content += `### Income Opportunity\n\n`;
            content += `> At **${levelProgress.nextLevelLabel}**, your service commission increases from **${(currentSvcRate * 100).toFixed(0)}%** to **${(nextSvcRate * 100).toFixed(0)}%** — estimated **+$${Math.round(monthlyUplift).toLocaleString()}/month** based on current revenue.\n\n`;
          }
        }
      } else {
        content += `**Current Level:** ${levelProgress.currentLevelLabel}\n`;
        content += `*Top level reached.*\n\n`;
      }

      // Retention warnings
      if (levelProgress.retention?.isAtRisk) {
        content += `### ⚠️ Retention Alert\n\n`;
        content += `Performance is below minimum standards in the following areas:\n\n`;
        levelProgress.retention.failures.forEach(f => {
          const formatVal = (val: number) => {
            if (f.unit === '/mo' || f.unit === '$') return `$${val.toLocaleString()}`;
            return `${val}${f.unit}`;
          };
          content += `- **${f.label}**: ${formatVal(f.current)} (minimum: ${formatVal(f.minimum)})\n`;
        });
        if (levelProgress.retention.gracePeriodDays > 0) {
          content += `\n*${levelProgress.retention.gracePeriodDays}-day improvement window*\n`;
        }
        content += '\n';
      }
    }

    return content;
  };

  const handlePreview = () => {
    setPreviewContent(generateReportContent());
    setShowPreview(true);
  };

  const handleCreateAndSend = async () => {
    const content = generateReportContent();
    const report = await createReport.mutateAsync({
      meeting_id: meetingId,
      team_member_id: teamMemberId,
      report_content: content,
      included_notes: selectedNotes,
      included_items: selectedItems,
    });

    await sendReport.mutateAsync(report.id);
    setIsBuilding(false);
    setSelectedNotes([]);
    setSelectedItems([]);
    setAdditionalContent('');
  };

  const sentReports = reports?.filter(r => r.sent_at) || [];

  // Build compliance summary line for the checkbox label
  const complianceSummaryParts: string[] = [];
  if (complianceData && complianceData.totalColorAppointments > 0) {
    complianceSummaryParts.push(`${complianceData.complianceRate}% reweigh`);
    if (complianceData.missed > 0) complianceSummaryParts.push(`${complianceData.missed} missed`);
    if (complianceData.wastePct > 0) complianceSummaryParts.push(`${complianceData.wastePct}% waste`);
    if (complianceData.overageChargeTotal > 0) complianceSummaryParts.push(`$${complianceData.overageChargeTotal.toFixed(2)} overages`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Check-in Reports</CardTitle>
        {!isBuilding && (
          <Button size={tokens.button.card} onClick={() => setIsBuilding(true)}>
            <FileText className="h-4 w-4 mr-1" />
            Build Report
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isBuilding && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-3">
              <Label className="text-base font-medium">Include Meeting Notes</Label>
              {shareableNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shareable notes available</p>
              ) : (
                <div className="space-y-2">
                  {shareableNotes.map((note) => (
                    <div key={note.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`note-${note.id}`}
                        checked={selectedNotes.includes(note.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedNotes([...selectedNotes, note.id]);
                          } else {
                            setSelectedNotes(selectedNotes.filter(id => id !== note.id));
                          }
                        }}
                      />
                      <label htmlFor={`note-${note.id}`} className="text-sm cursor-pointer flex-1">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {note.topic_category}
                        </Badge>
                        {note.content.slice(0, 100)}...
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Include Action Items</Label>
              {activeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No action items available</p>
              ) : (
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                      />
                      <label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer flex-1">
                        <span className="font-medium">{item.title}</span>
                        {item.due_date && (
                          <span className="text-muted-foreground ml-2">
                            Due: {formatDate(new Date(item.due_date), 'MMM d')}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Summary */}
            {perfData && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="include-performance"
                    checked={includePerformance}
                    onCheckedChange={(checked) => setIncludePerformance(!!checked)}
                  />
                  <label htmlFor="include-performance" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">Include Performance Summary</span>
                    <span className="text-muted-foreground ml-2">
                      (revenue, tips, rebook, retention, attachment)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Color Bar Performance */}
            {complianceData && complianceData.totalColorAppointments > 0 && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="include-compliance"
                    checked={includeCompliance}
                    onCheckedChange={(checked) => setIncludeCompliance(!!checked)}
                  />
                  <label htmlFor="include-compliance" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">Include Color Bar Performance</span>
                    <span className="text-muted-foreground ml-2">
                      ({complianceSummaryParts.join(' · ')})
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Level Progress */}
            {levelProgress && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="include-level-progress"
                    checked={includeLevelProgress}
                    onCheckedChange={(checked) => setIncludeLevelProgress(!!checked)}
                  />
                  <label htmlFor="include-level-progress" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">Include Level Progress</span>
                    <span className="text-muted-foreground ml-2">
                      ({levelProgress.currentLevelLabel}{levelProgress.nextLevelLabel ? ` → ${levelProgress.nextLevelLabel} · ${levelProgress.compositeScore}% ready` : ' · Top level'})
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Message (optional)</Label>
              <Textarea
                value={additionalContent}
                onChange={(e) => setAdditionalContent(e.target.value)}
                placeholder="Any additional notes or context for the team member..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button
                onClick={handleCreateAndSend}
                disabled={createReport.isPending || sendReport.isPending || (selectedNotes.length === 0 && selectedItems.length === 0 && !additionalContent.trim())}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Report
              </Button>
              <Button variant="ghost" onClick={() => setIsBuilding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {sentReports.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sent Reports</h4>
            {sentReports.map((report) => (
              <div key={report.id} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Sent {formatDate(new Date(report.sent_at!), 'MMM d, yyyy h:mm a')}
                  </span>
                  {report.acknowledged_at && (
                    <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Acknowledged
                    </Badge>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size={tokens.button.inline}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Report Content</DialogTitle>
                    </DialogHeader>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{report.report_content}</ReactMarkdown>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}

        {!isBuilding && sentReports.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No reports sent yet. Build a report to summarize this meeting.
          </p>
        )}
      </CardContent>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{previewContent}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

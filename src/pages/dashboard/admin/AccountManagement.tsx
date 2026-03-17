import { useState, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { GenerateTestAccountsButton } from '@/components/dashboard/GenerateTestAccountsButton';
import { CreateAdminAccountDialog } from '@/components/dashboard/CreateAdminAccountDialog';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  useAccountApprovals, 
  usePendingApprovals, 
  useApproveAccount, 
  useApproveAdminRole,
  useToggleSuperAdmin,
  useCanApproveAdmin 
} from '@/hooks/useAccountApproval';
import { 
  useStaffInvitations, 
  usePendingInvitations,
  useCancelInvitation,
  useResendInvitation
} from '@/hooks/useStaffInvitations';
import { useAllUsersWithRoles } from '@/hooks/useUserRoles';
import { InviteStaffDialog } from '@/components/dashboard/InviteStaffDialog';
import { formatDistanceToNow, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Crown,
  UserCheck,
  AlertTriangle,
  Mail,
  Send,
  UserPlus,
  RefreshCw,
  QrCode,
  Download,
  Eye,
  Sparkles,
  Maximize2,
  ArrowLeft,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';
import BrandLogo from '@/assets/brand-logo-secondary.svg';
import { PLATFORM_NAME } from '@/lib/brand';
import { QRCodeFullScreen } from '@/components/dashboard/QRCodeFullScreen';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  stylist: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  assistant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  receptionist: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const INVITATION_STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600', label: 'Pending' },
  accepted: { icon: CheckCircle, color: 'text-green-600', label: 'Accepted' },
  expired: { icon: AlertTriangle, color: 'text-gray-500', label: 'Expired' },
  cancelled: { icon: XCircle, color: 'text-red-600', label: 'Cancelled' },
};

const getStaffLoginUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  return '/login';
};

function QRCodePDFPreview({ staffLoginUrl }: { staffLoginUrl: string }) {
  return (
    <div className="bg-gradient-to-b from-[hsl(40,30%,96%)] to-[hsl(35,25%,92%)] rounded-xl p-6 shadow-inner">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden mx-auto relative" style={{ aspectRatio: '8.5/11', maxWidth: '340px' }}>
        <div className="bg-gradient-to-r from-[hsl(0,0%,8%)] to-[hsl(0,0%,15%)] py-3 px-4 text-center">
          <img src={BrandLogo} alt={PLATFORM_NAME} className="h-3 mx-auto invert" />
          <p className="text-[hsl(40,30%,70%)] text-[7px] mt-0.5 tracking-[0.2em] uppercase">Staff Portal</p>
        </div>
        <div className="flex flex-col items-center px-6 py-4">
          <div className="text-center mb-3">
            <p className="text-base text-foreground font-display tracking-wide">Welcome to the team!</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto">
              You need to create your profile on our software system.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-[hsl(35,30%,88%)] shadow-md">
            <QRCodeCanvas value={staffLoginUrl} size={140} level="H" marginSize={1} fgColor="hsl(0, 0%, 8%)" />
          </div>
          <div className="mt-3 text-center">
            <h3 className="font-display text-sm tracking-[0.15em] uppercase text-foreground">Create Your Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Scan this QR code to get started</p>
          </div>
          <div className="pt-3 text-center max-w-[180px]">
            <p className="text-[8px] text-muted-foreground">
              Or visit: <span className="text-foreground break-all">{staffLoginUrl.replace('https://', '')}</span>
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-[hsl(0,0%,8%)] px-4 py-1.5 flex items-center justify-center">
          <p className="text-[7px] text-[hsl(40,30%,55%)] tracking-wide">Powered by {PLATFORM_NAME}</p>
        </div>
      </div>
    </div>
  );
}

function QRCodeCard() {
  const qrRef = useRef<HTMLDivElement>(null);
  const staffLoginUrl = getStaffLoginUrl();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const pdfCanvas = document.createElement('canvas');
    const ctx = pdfCanvas.getContext('2d');
    if (!ctx) return;

    const width = 2550;
    const height = 3300;
    pdfCanvas.width = width;
    pdfCanvas.height = height;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#f8f6f1');
    bgGradient.addColorStop(1, '#ede9e0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const headerHeight = Math.round(height * 0.06);
    const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
    headerGradient.addColorStop(0, '#141414');
    headerGradient.addColorStop(1, '#262626');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = '#f8f6f1';
    ctx.font = '500 60px Termina, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(PLATFORM_NAME.toUpperCase() + '®', width / 2, headerHeight * 0.5 + 10);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#a8a090';
    ctx.fillText('STAFF PORTAL', width / 2, headerHeight * 0.5 + 50);

    const contentStartY = headerHeight + 120;
    ctx.fillStyle = '#141414';
    ctx.font = '500 72px Termina, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME TO THE TEAM!', width / 2, contentStartY);
    ctx.fillStyle = '#666666';
    ctx.font = '42px sans-serif';
    ctx.fillText('You need to create your profile on', width / 2, contentStartY + 70);
    ctx.fillText('our software system.', width / 2, contentStartY + 120);

    const qrSize = 750;
    const qrX = (width - qrSize) / 2;
    const qrY = contentStartY + 200;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.roundRect(qrX - 50, qrY - 50, qrSize + 100, qrSize + 100, 40);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    const titleY = qrY + qrSize + 140;
    ctx.fillStyle = '#141414';
    ctx.font = '500 60px Termina, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CREATE YOUR ACCOUNT', width / 2, titleY);
    ctx.fillStyle = '#666666';
    ctx.font = '40px sans-serif';
    ctx.fillText('Scan this QR code to get started', width / 2, titleY + 65);

    const urlY = titleY + 150;
    ctx.fillStyle = '#888888';
    ctx.font = '32px sans-serif';
    ctx.fillText('Or visit:', width / 2, urlY);
    ctx.fillStyle = '#141414';
    const urlText = staffLoginUrl.replace('https://', '').replace('http://', '');
    ctx.fillText(urlText, width / 2, urlY + 45);

    const footerHeight = Math.round(height * 0.03);
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, height - footerHeight, width, footerHeight);
    ctx.fillStyle = '#8a8070';
    ctx.font = '28px sans-serif';
    ctx.fillText(`Powered by ${PLATFORM_NAME}`, width / 2, height - footerHeight / 2 + 10);

    const link = document.createElement('a');
    link.download = 'staff-signup-qr.png';
    link.href = pdfCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card className={`${tokens.card.wrapper} overflow-hidden`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Staff Signup QR Code
          <Sparkles className="w-3 h-3 text-amber-500" />
        </CardTitle>
        <CardDescription>Print this for your handbook or post in the break room</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={qrRef} className="hidden">
          <QRCodeCanvas value={staffLoginUrl} size={180} level="H" marginSize={0} fgColor="#141414" />
        </div>
        <div className="flex justify-center p-4 bg-gradient-to-b from-[hsl(40,30%,96%)] to-[hsl(35,25%,92%)] rounded-xl">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden relative" style={{ width: '110px', aspectRatio: '8.5/11' }}>
            <div className="bg-gradient-to-r from-[hsl(0,0%,8%)] to-[hsl(0,0%,15%)] py-1 px-2 text-center">
              <span className="text-[4px] text-[hsl(40,30%,95%)] font-display tracking-wider block">{PLATFORM_NAME.toUpperCase()}®</span>
              <span className="text-[2.5px] text-[hsl(40,30%,70%)] tracking-[0.15em] uppercase block">Staff Portal</span>
            </div>
            <div className="flex flex-col items-center px-2 py-2">
              <div className="text-center mb-1.5">
                <p className="text-[4px] font-display tracking-wide text-foreground">WELCOME TO THE TEAM!</p>
                <p className="text-[3px] text-muted-foreground leading-tight max-w-[70px] mx-auto">
                  You need to create your profile on our software system.
                </p>
              </div>
              <div className="p-1.5 bg-white rounded border border-[hsl(35,30%,88%)] shadow-sm">
                <QRCodeCanvas value={staffLoginUrl} size={50} level="H" marginSize={0} fgColor="#141414" />
              </div>
              <div className="mt-1.5 text-center">
                <p className="text-[4px] font-display tracking-[0.1em] uppercase">Create Your Account</p>
                <p className="text-[3px] text-muted-foreground">Scan this QR code to get started</p>
              </div>
              <div className="mt-1 text-center max-w-[65px]">
                <p className="text-[2.5px] text-muted-foreground">
                  Or visit: <span className="text-foreground break-all">{staffLoginUrl.replace('https://', '')}</span>
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-[hsl(0,0%,8%)] py-0.5 flex items-center justify-center">
              <span className="text-[2.5px] text-[hsl(40,30%,55%)]">Powered by {PLATFORM_NAME}</span>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Create Your Staff Account</p>
          <p className="text-xs mt-1 break-all">{staffLoginUrl}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setFullscreenOpen(true)}
          >
            <Maximize2 className="w-4 h-4" />
            On Screen
          </Button>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  QR Code Preview
                </DialogTitle>
              </DialogHeader>
              <QRCodePDFPreview staffLoginUrl={staffLoginUrl} />
              <div className="flex justify-end">
                <Button onClick={() => { downloadQRCode(); setPreviewOpen(false); }} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={downloadQRCode} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        <QRCodeFullScreen 
          isOpen={fullscreenOpen} 
          onClose={() => setFullscreenOpen(false)} 
          url={staffLoginUrl} 
        />
      </CardContent>
    </Card>
  );
}

export default function AccountManagement() {
  const { formatDate } = useFormatDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'invitations' | 'approvals'>('invitations');

  // Approvals data
  const { data: allAccounts, isLoading: loadingAccounts, refetch: refetchApprovals } = useAccountApprovals();
  const { data: pendingAccounts, isLoading: loadingPendingAccounts } = usePendingApprovals();
  const { data: usersWithRoles } = useAllUsersWithRoles();
  const { data: canApproveAdmin } = useCanApproveAdmin();
  const approveAccount = useApproveAccount();
  const approveAdminRole = useApproveAdminRole();
  const toggleSuperAdmin = useToggleSuperAdmin();

  // Invitations data
  const { data: allInvitations, isLoading: loadingInvitations } = useStaffInvitations();
  const { data: pendingInvitations, isLoading: loadingPendingInvitations } = usePendingInvitations();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  const getUserRoles = (userId: string) => {
    const user = usersWithRoles?.find(u => u.user_id === userId);
    return user?.roles || [];
  };

  const getActualStatus = (invitation: NonNullable<typeof allInvitations>[number]) => {
    if (invitation.status === 'pending' && isPast(new Date(invitation.expires_at))) {
      return 'expired';
    }
    return invitation.status;
  };

  // Filter based on active tab
  const filteredAccounts = allAccounts?.filter(account => {
    const searchLower = searchQuery.toLowerCase();
    return (
      account.full_name?.toLowerCase().includes(searchLower) ||
      account.display_name?.toLowerCase().includes(searchLower) ||
      account.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInvitations = allInvitations?.filter(invitation => {
    const searchLower = searchQuery.toLowerCase();
    return (
      invitation.email.toLowerCase().includes(searchLower) ||
      invitation.role.toLowerCase().includes(searchLower) ||
      invitation.inviter_name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const pendingApprovalCount = pendingAccounts?.length || 0;
  const approvedCount = allAccounts?.filter(a => a.is_approved).length || 0;
  const superAdminCount = allAccounts?.filter(a => a.is_super_admin).length || 0;
  const pendingInviteCount = pendingInvitations?.length || 0;
  const acceptedInviteCount = allInvitations?.filter(i => i.status === 'accepted').length || 0;

  const AccountCard = ({ account }: { account: NonNullable<typeof allAccounts>[number] }) => {
    const roles = getUserRoles(account.user_id);
    const hasAdminRole = roles.includes('admin') || roles.includes('super_admin');
    const needsAdminApproval = hasAdminRole && !account.admin_approved_by && !account.is_super_admin;

    return (
      <Card className={cn(
        "transition-all",
        !account.is_approved && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
        needsAdminApproval && account.is_approved && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={account.photo_url || undefined} />
              <AvatarFallback className="bg-muted text-lg">
                {account.full_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-medium truncate">
                  {account.display_name || account.full_name}
                </h3>
                {account.is_super_admin && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={cn(
                        "gap-1 border",
                        account.is_primary_owner 
                          ? "bg-stone-700/90 text-amber-100 border-amber-400/30 backdrop-blur-sm" 
                          : "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent"
                      )}>
                        <Crown className="w-3 h-3" />
                        {account.is_primary_owner ? 'Account Owner' : 'Super Admin'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {account.is_primary_owner ? 'Account owner - cannot be revoked' : 'Can approve other admins'}
                    </TooltipContent>
                  </Tooltip>
                )}
                {account.is_approved ? (
                  <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground truncate">{account.email}</p>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {roles.map(role => (
                  <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                ))}
              </div>

              {needsAdminApproval && (
                <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Admin role needs approval from Super Admin</span>
                </div>
              )}

              {account.approved_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Approved {formatDate(new Date(account.approved_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2">
                <Label htmlFor={`approve-${account.user_id}`} className="text-xs text-muted-foreground">Approved</Label>
                <Switch
                  id={`approve-${account.user_id}`}
                  checked={account.is_approved}
                  onCheckedChange={(checked) => approveAccount.mutate({ userId: account.user_id, approve: checked })}
                  disabled={approveAccount.isPending}
                />
              </div>

              {hasAdminRole && canApproveAdmin && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`admin-${account.user_id}`} className="text-xs text-muted-foreground">Admin Approved</Label>
                  <Switch
                    id={`admin-${account.user_id}`}
                    checked={!!account.admin_approved_by}
                    onCheckedChange={(checked) => approveAdminRole.mutate({ userId: account.user_id, approve: checked })}
                    disabled={approveAdminRole.isPending}
                  />
                </div>
              )}

              {canApproveAdmin && account.is_approved && (
                account.is_primary_owner ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size={tokens.button.card}
                        disabled
                        className="gap-1 bg-stone-700/90 text-amber-100 border border-amber-400/30 backdrop-blur-sm opacity-100 cursor-not-allowed hover:bg-stone-700/90"
                      >
                        <Crown className="w-3 h-3" />
                        Account Owner
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Account owner - cannot be revoked</TooltipContent>
                  </Tooltip>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={account.is_super_admin ? "default" : "outline"}
                        size={tokens.button.card}
                        className={cn("gap-1", account.is_super_admin && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600")}
                      >
                        <Crown className="w-3 h-3" />
                        {account.is_super_admin ? 'Super Admin' : 'Grant Super Admin'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {account.is_super_admin ? 'Revoke Super Admin Status?' : 'Grant Super Admin Status?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {account.is_super_admin 
                            ? `${account.full_name} will no longer be able to approve other admin accounts.`
                            : `${account.full_name} will be able to approve other admin accounts and grant super admin status to others.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => toggleSuperAdmin.mutate({ userId: account.user_id, grant: !account.is_super_admin })}
                        >
                          {account.is_super_admin ? 'Revoke' : 'Grant'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const InvitationCard = ({ invitation }: { invitation: NonNullable<typeof allInvitations>[number] }) => {
    const actualStatus = getActualStatus(invitation);
    const statusConfig = INVITATION_STATUS_CONFIG[actualStatus] || INVITATION_STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    const isExpired = actualStatus === 'expired';
    const isPending = actualStatus === 'pending';

    return (
      <Card className={cn(
        "transition-all",
        isPending && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
        isExpired && "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/20 opacity-75"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{invitation.email}</span>
                <Badge className={cn("text-xs", ROLE_COLORS[invitation.role])}>{invitation.role}</Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <StatusIcon className={cn("h-3.5 w-3.5", statusConfig.color)} />
                  {statusConfig.label}
                </span>
                <span>Invited by {invitation.inviter_name}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}</span>
                  </TooltipTrigger>
                  <TooltipContent>{formatDate(new Date(invitation.created_at), 'PPpp')}</TooltipContent>
                </Tooltip>
              </div>

              {isPending && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                </p>
              )}

              {actualStatus === 'accepted' && invitation.accepted_at && (
                <p className="text-xs text-green-600 mt-1">Accepted {formatDate(new Date(invitation.accepted_at), 'PPp')}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(isPending || isExpired) && (
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => resendInvitation.mutate({ email: invitation.email, role: invitation.role })}
                  disabled={resendInvitation.isPending}
                  className="gap-1"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", resendInvitation.isPending && "animate-spin")} />
                  Resend
                </Button>
              )}
              
              {isPending && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size={tokens.button.inline} className="gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the invitation for {invitation.email}. They will no longer be able to use it to create an account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelInvitation.mutate(invitation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Invitation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <DashboardPageHeader
          title="Account Invitations & Approvals"
          description="Invite new team members and manage account access"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <CreateAdminAccountDialog onSuccess={() => refetchApprovals()} />
              <GenerateTestAccountsButton />
              <InviteStaffDialog />
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Send className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{pendingInviteCount}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{pendingApprovalCount}</p>
                <p className="text-sm text-muted-foreground">Needs Approval</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Crown className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-medium">{superAdminCount}</p>
                <p className="text-sm text-muted-foreground">Super Admins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'invitations' ? "Search by email, role, or inviter..." : "Search by name or email..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'invitations' | 'approvals'); setSearchQuery(''); }}>
          <ResponsiveTabsList onTabChange={(v) => { setActiveTab(v as 'invitations' | 'approvals'); setSearchQuery(''); }}>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="w-4 h-4" />
              Invitations
              {pendingInviteCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 text-xs px-1.5">{pendingInviteCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Approvals
              {pendingApprovalCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">{pendingApprovalCount}</Badge>
              )}
            </TabsTrigger>
          </ResponsiveTabsList>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-4 mt-4">
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1">
                  Pending
                  {pendingInviteCount > 0 && <Badge variant="secondary" className="h-5 min-w-5 text-xs px-1.5">{pendingInviteCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="all">All Invitations</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {loadingPendingInvitations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingInvitations?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">No pending invitations</p>
                      <InviteStaffDialog />
                    </CardContent>
                  </Card>
                ) : (
                  pendingInvitations?.map(invitation => <InvitationCard key={invitation.id} invitation={invitation} />)
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-3 mt-4">
                {loadingInvitations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredInvitations?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {searchQuery ? 'No invitations found matching your search' : 'No invitations yet'}
                    </CardContent>
                  </Card>
                ) : (
                  filteredInvitations?.map(invitation => <InvitationCard key={invitation.id} invitation={invitation} />)
                )}
              </TabsContent>
            </Tabs>

            {/* QR Code and Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <QRCodeCard />
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    How Invitations Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">Sending:</strong> When you invite someone, they receive an invitation to create their account.</p>
                  <p><strong className="text-foreground">Expiration:</strong> Invitations expire after 7 days. You can resend expired invitations.</p>
                  <p><strong className="text-foreground">Auto-approval:</strong> Users who sign up with a valid invitation are automatically approved with their assigned role.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-4 mt-4">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Accounts</TabsTrigger>
                <TabsTrigger value="pending" className="gap-1">
                  Pending
                  {pendingApprovalCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">{pendingApprovalCount}</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAccounts?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">No accounts found matching your search</CardContent>
                  </Card>
                ) : (
                  filteredAccounts?.map(account => <AccountCard key={account.user_id} account={account} />)
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-3 mt-4">
                {loadingPendingAccounts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingAccounts?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                      <p className="text-muted-foreground">All accounts have been approved!</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingAccounts?.map(account => <AccountCard key={account.user_id} account={account} />)
                )}
              </TabsContent>
            </Tabs>

            {/* Info Card */}
            <Card className="bg-muted/50 mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permission Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">Account Approval:</strong> Any admin can approve general account access.</p>
                <p><strong className="text-foreground">Admin Role Approval:</strong> Only Super Admins can approve users for the Admin role.</p>
                <p><strong className="text-foreground">Super Admin:</strong> Can approve admin roles and grant Super Admin status to others.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

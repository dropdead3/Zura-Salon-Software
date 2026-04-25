import { useNavigate } from 'react-router-dom';
import { Building2, Copy, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';

/**
 * NoOrganization
 * --------------
 * Calm, advisory dead-end for authenticated users whose account is not
 * linked to an organization yet. Lives outside the dashboard provider
 * tree so it cannot recursively trigger the "no org → redirect" cascade
 * that previously bounced users to the marketing landing page on refresh.
 *
 * Doctrine:
 *  - Advisory tone, no shame language
 *  - Explain why the gap exists and what the next move is
 *  - Two clear actions: contact admin, sign out
 *  - Surfaces the signed-in email so the operator knows which account they're on
 */
export default function NoOrganization() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? '';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied', { description: 'Share this with your administrator.' });
    } catch {
      toast.error('Could not copy', { description: 'Your browser blocked clipboard access.' });
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <Building2 className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>

          <h1 className={cn('font-display tracking-wide uppercase text-xl text-foreground mb-3')}>
            No Organization Linked
          </h1>

          <p className={cn(tokens.empty.description, 'max-w-sm mb-8')}>
            Your {PLATFORM_NAME} account isn't connected to an organization yet.
            Reach out to your account owner or administrator so they can add you to the team.
          </p>

          {email && (
            <div className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3">
              <div className="text-left min-w-0">
                <div className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  Signed in as
                </div>
                <div className="font-sans text-sm text-foreground truncate">{email}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyEmail}
                className="shrink-0 h-8 px-2 font-sans text-xs"
                aria-label="Copy email address"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          )}

          <div className="w-full flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              variant="outline"
              className="w-full font-sans"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>

          <p className="font-sans text-xs text-muted-foreground/70 mt-6">
            Already added? Try signing out and back in to refresh your access.
          </p>
        </div>
      </div>
    </div>
  );
}

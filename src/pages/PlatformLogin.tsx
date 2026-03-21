import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useInvitationByToken, useAcceptPlatformInvitation } from '@/hooks/usePlatformInvitations';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Terminal, ArrowRight, Sparkles, Mail, UserPlus } from 'lucide-react';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { PlatformCard } from '@/components/platform/ui/PlatformCard';

export default function PlatformLogin() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from?.pathname?.startsWith('/dashboard/platform')
    ? location.state.from.pathname
    : '/dashboard/platform/overview';
  
  const { data: invitation, isLoading: loadingInvitation } = useInvitationByToken(invitationToken);
  const acceptInvitationMutation = useAcceptPlatformInvitation();

  // Set signup mode and pre-fill email when invitation is loaded
  useEffect(() => {
    if (invitation && invitation.status === 'pending') {
      setEmail(invitation.email);
      setIsSignupMode(true);
    }
  }, [invitation]);

  // Check if already logged in as platform user
  useEffect(() => {
    const checkPlatformAccess = async () => {
      if (user) {
        setCheckingAccess(true);
        
        // If we have an invitation token, accept it
        if (invitationToken && invitation?.status === 'pending') {
          try {
            await acceptInvitationMutation.mutateAsync({
              token: invitationToken,
              userId: user.id,
            });
            toast({
              title: 'Welcome to the Platform Team!',
              description: `You've been granted ${invitation.role.replace('platform_', '')} access.`,
            });
            navigate(redirectTarget, { replace: true });
            return;
          } catch (error) {
            console.error('Failed to accept invitation:', error);
          }
        }
        
        const { data } = await supabase
          .from('platform_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);

        if (data && data.length > 0) {
          navigate(redirectTarget, { replace: true });
        }
        setCheckingAccess(false);
      }
    };

    checkPlatformAccess();
  }, [user, navigate, invitationToken, invitation, acceptInvitationMutation]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if user has platform role
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        // If there's an invitation, accept it
        if (invitationToken && invitation?.status === 'pending') {
          try {
            await acceptInvitationMutation.mutateAsync({
              token: invitationToken,
              userId: session.session.user.id,
            });
            toast({
              title: 'Welcome to the Platform Team!',
              description: `You've been granted ${invitation.role.replace('platform_', '')} access.`,
            });
            navigate(redirectTarget, { replace: true });
            return;
          } catch (error) {
            console.error('Failed to accept invitation:', error);
          }
        }

        const { data: roles } = await supabase
          .from('platform_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .limit(1);

        if (!roles || roles.length === 0) {
          // Sign out and show error
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'You do not have platform access. Contact your administrator.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        toast({
          title: 'Welcome back',
          description: 'Redirecting to Platform Admin Hub...',
        });

        navigate(redirectTarget, { replace: true });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationToken || !invitation) {
      toast({
        title: 'Invalid invitation',
        description: 'A valid invitation is required to create an account.',
        variant: 'destructive',
      });
      return;
    }

    if (invitation.status !== 'pending') {
      toast({
        title: 'Invitation expired',
        description: 'This invitation has already been used or has expired.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // For platform invitations, we use 'admin' as the base role since
      // the platform role is assigned separately after account creation
      const { error } = await signUp(email, password, fullName, 'admin');

      if (error) {
        toast({
          title: 'Signup failed',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account, then sign in.',
      });

      setIsSignupMode(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess || loadingInvitation) {
    return (
      <div className="min-h-screen platform-gradient-radial platform-theme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-slate-400 text-sm">
            {loadingInvitation ? 'Loading invitation...' : 'Checking access...'}
          </p>
        </div>
      </div>
    );
  }

  // Show expired/invalid invitation message
  if (invitationToken && invitation && invitation.status !== 'pending') {
    return (
      <div className="min-h-screen platform-gradient-radial platform-theme flex flex-col items-center justify-center px-4">
        <PlatformCard variant="glass" className="max-w-md w-full p-8 text-center">
          <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-4">
            <Mail className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">
            {invitation.status === 'accepted' ? 'Invitation Already Used' : 'Invitation Expired'}
          </h2>
          <p className="text-slate-400 mb-6">
            {invitation.status === 'accepted' 
              ? 'This invitation has already been accepted.'
              : 'This invitation has expired or been cancelled.'}
          </p>
          <PlatformButton 
            onClick={() => navigate('/login', { replace: true })}
            variant="glow"
          >
            Go to Login
          </PlatformButton>
        </PlatformCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen platform-gradient-radial platform-theme flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl platform-animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg platform-button-glow">
                  {isSignupMode ? (
                    <UserPlus className="w-8 h-8 text-white" />
                  ) : (
                    <Terminal className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-medium text-white tracking-tight">
              {isSignupMode ? 'Create Your Account' : 'Platform Administration'}
            </h1>
            <p className="text-slate-400">
              {isSignupMode 
                ? `You've been invited as ${invitation?.role.replace('platform_', '').replace('_', ' ')}`
                : 'Internal access for development and support teams'}
            </p>
          </div>

          {/* Form Card */}
          <PlatformCard variant="glass" glow className="p-8 shadow-2xl">
            <form onSubmit={isSignupMode ? handleSignUp : handleSignIn} className="space-y-6">
              {isSignupMode && (
                <div className="space-y-2">
                  <PlatformLabel htmlFor="fullName">Full Name</PlatformLabel>
                  <PlatformInput
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <PlatformLabel htmlFor="email">Email</PlatformLabel>
                <PlatformInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  disabled={isSignupMode && !!invitation}
                />
              </div>

              <div className="space-y-2">
                <PlatformLabel htmlFor="password">Password</PlatformLabel>
                <PlatformInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isSignupMode ? 'new-password' : 'current-password'}
                  minLength={isSignupMode ? 8 : undefined}
                />
                {isSignupMode && (
                  <p className="text-xs text-slate-500">Must be at least 8 characters</p>
                )}
              </div>

              <PlatformButton
                type="submit"
                loading={loading}
                variant="glow"
                className="w-full h-12 text-base"
              >
                {loading 
                  ? (isSignupMode ? 'Creating account...' : 'Signing in...')
                  : (isSignupMode ? 'Create Account' : 'Sign In')}
              </PlatformButton>

              {isSignupMode && (
                <p className="text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignupMode(false)}
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Sign in instead
                  </button>
                </p>
              )}
            </form>
          </PlatformCard>

          {/* Footer link */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-violet-400 text-sm transition-colors group"
            >
              Salon staff? Login here
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="py-6 text-center relative z-10">
        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} Platform Admin • Internal Use Only
        </p>
      </div>
    </div>
  );
}

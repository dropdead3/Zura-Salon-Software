import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import Logo from '@/assets/brand-logo-secondary.svg';
import { z } from 'zod';
import { useCheckInvitation, useAcceptInvitation } from '@/hooks/useStaffInvitations';
import { useDebounce } from '@/hooks/use-debounce';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' });

import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Helper to get custom landing page for a user
async function getCustomLandingPage(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('custom_landing_page')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) return null;
    return data?.custom_landing_page || null;
  } catch {
    return null;
  }
}

export default function StaffLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('stylist');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const passwordMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPasswordMatchStateRef = useRef<boolean | null>(null);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const acceptInvitation = useAcceptInvitation();
  const { roleOptions } = useRoleUtils();

  // Debounce email for invitation check
  const debouncedEmail = useDebounce(email, 500);
  const { data: invitation, isLoading: checkingInvitation } = useCheckInvitation(debouncedEmail);

  // When an invitation is found, auto-set the role
  useEffect(() => {
    if (invitation && !isLogin) {
      setRole(invitation.role);
    }
  }, [invitation, isLogin]);

  // Default landing page (can be overridden by location.state)
  const from = location.state?.from?.pathname || '/dashboard';

  const showPasswordMatchToast = useCallback((matches: boolean) => {
    // Only show toast if state changed
    if (lastPasswordMatchStateRef.current === matches) return;
    lastPasswordMatchStateRef.current = matches;
    
    if (matches) {
      toast({
        title: 'Passwords match ✓',
        description: 'You\'re all set!',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical.',
      });
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    // Validate email
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setEmailError(emailValidation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Reset failed',
            description: error.message,
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link.',
          });
          setIsForgotPassword(false);
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Login failed',
            description: error.message,
          });
        } else {
          // Check for custom landing page preference
          const { data: { user: loggedInUser } } = await supabase.auth.getUser();
          let landingPage = from;
          
          if (loggedInUser) {
            const customLanding = await getCustomLandingPage(loggedInUser.id);
            if (customLanding) {
              landingPage = customLanding;
            }
          }
          
          navigate(landingPage, { replace: true });
        }
      } else {
        if (password !== confirmPassword) {
          toast({
            variant: 'destructive',
            title: 'Passwords do not match',
            description: 'Please make sure your passwords match.',
          });
          return;
        }
        const { error, data } = await signUp(email, password, fullName, (invitation?.role || role) as AppRole);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Sign up failed',
            description: error.message,
          });
        } else {
          // If there was an invitation, mark it as accepted
          if (invitation && data?.user) {
            acceptInvitation.mutate({ email, userId: data.user.id });
          }
          toast({
            title: invitation ? 'Welcome to the team!' : 'Account created',
            description: invitation 
              ? `Your account has been created with the ${roleOptions.find(r => r.value === invitation.role)?.label} role.`
              : `Welcome! You've been registered as ${roleOptions.find(r => r.value === role)?.label}.`,
          });
          navigate('/dashboard', { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </Link>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md p-8 rounded-3xl border-2 border-[hsl(35,30%,65%)/0.8] bg-[hsl(35,30%,95%)/0.3] backdrop-blur-sm shadow-[0_0_40px_-10px_hsl(35,30%,70%)/0.3]">
          <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Logo */}
          <div className="text-center">
            <img 
              src={Logo} 
              alt="Salon" 
              className="h-6 w-auto mx-auto mb-8"
            />
            <h1 className="font-display text-2xl tracking-wide">
              {isForgotPassword ? 'RESET PASSWORD' : isLogin ? 'STAFF LOGIN' : 'CREATE ACCOUNT'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-sans">
              {isForgotPassword
                ? 'Enter your email to receive a reset link'
                : isLogin 
                  ? 'Access your employee dashboard' 
                  : 'Use your preferred email for all employment software and apps'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !isForgotPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required={!isLogin}
                    className="h-12 bg-card border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">
                    Your Role
                  </Label>
                  {invitation ? (
                    <div className="h-12 px-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 rounded-md">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <span className="font-medium text-green-800 dark:text-green-200">
                          {roleOptions.find(r => r.value === invitation.role)?.label}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                          (assigned by invitation)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)} required>
                      <SelectTrigger className="h-12 bg-card border-border">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="you@yoursalon.com"
                  required
                  className={`h-12 bg-card border-border pr-10 ${emailError ? 'border-destructive' : ''} ${invitation && !isLogin ? 'border-green-500' : ''}`}
                />
                {!isLogin && checkingInvitation && debouncedEmail.includes('@') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isLogin && invitation && !checkingInvitation && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              {!isLogin && invitation && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <Mail className="w-3 h-3" />
                  <span>You have a pending invitation!</span>
                </div>
              )}
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-12 bg-card border-border pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setConfirmPassword(newValue);
                      
                      // Clear existing timeout
                      if (passwordMatchTimeoutRef.current) {
                        clearTimeout(passwordMatchTimeoutRef.current);
                      }
                      
                      // Debounced password match feedback
                      if (newValue.length >= 6 && password.length >= 6) {
                        passwordMatchTimeoutRef.current = setTimeout(() => {
                          showPasswordMatchToast(newValue === password);
                        }, 800);
                      }
                    }}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={`h-12 bg-card border-border pr-12 ${confirmPassword.length >= 6 ? (confirmPassword === password ? 'border-green-500' : 'border-destructive') : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length >= 6 && (
                  <p className={`text-xs ${confirmPassword === password ? 'text-green-600' : 'text-destructive'}`}>
                    {confirmPassword === password ? 'Passwords match ✓' : 'Passwords do not match'}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {isLogin && !isForgotPassword && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsLogin(false)}
                  className="flex-1 h-12 font-display text-sm tracking-wide bg-secondary hover:bg-secondary/80 text-foreground border-2 border-foreground/20"
                >
                  SIGN UP
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 font-display text-sm tracking-wide"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isForgotPassword ? (
                  'SEND RESET LINK'
                ) : isLogin ? (
                  'SIGN IN'
                ) : (
                  'CREATE ACCOUNT'
                )}
              </Button>
            </div>
          </form>

          {/* Toggle & Forgot Password */}
          <div className="text-center space-y-3">
            {isLogin && !isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                Forgot password?
              </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(!isLogin);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                {isForgotPassword
                  ? 'Back to sign in'
                  : isLogin 
                    ? "Don't have an account? Sign up" 
                    : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

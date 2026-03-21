import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, LogOut, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useValidatePin } from '@/hooks/useUserPin';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Logo from '@/assets/brand-logo-secondary.svg';
import LogoWhite from '@/assets/brand-logo-secondary-white.svg';
import { tokens } from '@/lib/design-tokens';

interface DashboardLockScreenProps {
  onUnlock: (user?: { user_id: string; display_name: string }) => void;
}

export function DashboardLockScreen({ onUnlock }: DashboardLockScreenProps) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { resolvedTheme } = useDashboardTheme();
  const { data: businessSettings } = useBusinessSettings();
  const validatePin = useValidatePin();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedUser, setValidatedUser] = useState<{
    display_name: string;
    photo_url: string | null;
  } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const getLogo = () => {
    const isDark = resolvedTheme === 'dark';
    const customLogo = isDark ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
    return customLogo || (isDark ? LogoWhite : Logo);
  };

  const handlePinDigit = useCallback((digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      setValidatedUser(null);
    }
  }, [pin]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
    setValidatedUser(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError(false);
    setValidatedUser(null);
  }, []);

  // Auto-validate when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isValidating) {
      setIsValidating(true);
      
      validatePin.mutateAsync(pin)
        .then((result) => {
          if (result) {
            setValidatedUser({
              display_name: result.display_name,
              photo_url: result.photo_url,
            });
            setIsUnlocking(true);
            
            // Intentional delay for premium feel (1.5 seconds)
            setTimeout(() => {
              onUnlock({ user_id: result.user_id, display_name: result.display_name });
              navigate('/dashboard/schedule', { 
                state: { 
                  quickLoginUserId: result.user_id,
                  quickLoginUserName: result.display_name 
                } 
              });
            }, 1500);
          } else {
            setError(true);
            setPin('');
          }
        })
        .catch(() => {
          setError(true);
          setPin('');
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [pin, isValidating, validatePin, onUnlock, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePinDigit, handleDelete, handleClear]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Unlocking Overlay */}
      <AnimatePresence>
        {isUnlocking && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Success avatar with glow */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {/* Animated glow */}
              <motion.div
                className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Avatar className="h-24 w-24 ring-4 ring-primary/30 ring-offset-4 ring-offset-background">
                <AvatarImage src={validatedUser?.photo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {validatedUser?.display_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Checkmark overlay */}
              <motion.div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shadow-lg ring-2 ring-emerald-200/50 dark:ring-emerald-700/30"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  rotate: [-180, 10, 0]
                }}
                transition={{ 
                  delay: 0.3, 
                  duration: 0.6,
                  times: [0, 0.6, 1],
                  ease: [0.34, 1.56, 0.64, 1]
                }}
              >
                {/* Subtle glow pulse */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-emerald-400/30 dark:bg-emerald-500/20"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3, ease: 'easeOut' }}
                >
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </motion.div>
              </motion.div>
            </motion.div>
            
            {/* Welcome text */}
            <motion.div
              className="text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-display font-medium mb-2">
                Welcome back
              </h2>
              <p className="text-lg text-primary font-medium">
                {validatedUser?.display_name}
              </p>
            </motion.div>
            
            {/* Loading dots */}
            <motion.div
              className="flex gap-1.5 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: Infinity, 
                    delay: i * 0.15,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Logo */}
      <motion.div
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <img 
          src={getLogo()} 
          alt={businessSettings?.business_name || 'Logo'} 
          className="h-6 w-auto" 
        />
      </motion.div>

      {/* Lock Icon */}
      <motion.div
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <Lock className="w-8 h-8 text-primary" />
      </motion.div>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-2xl font-display font-medium mb-2">Enter PIN to unlock</h1>
        <p className="text-muted-foreground text-sm">
          Enter your 4-digit PIN to continue
        </p>
      </motion.div>

      {/* Validated User Preview - Enhanced */}
      <AnimatePresence>
        {validatedUser && !isUnlocking && (
          <motion.div
            className="flex flex-col items-center gap-3 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Avatar with glow ring */}
            <div className="relative">
              {/* Animated glow ring */}
              <motion.div
                className="absolute -inset-2 rounded-full bg-primary/30 blur-lg"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Avatar className="h-16 w-16 ring-2 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={validatedUser.photo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {validatedUser.display_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="font-medium text-lg">{validatedUser.display_name}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Display */}
      <motion.div
        className="flex items-center gap-2 mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex gap-3 px-6 py-4 rounded-2xl bg-muted/50">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length 
                  ? error ? 'bg-destructive' : 'bg-primary' 
                  : 'bg-muted-foreground/30'
              }`}
              animate={error && i < pin.length ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
        <button
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowPin(!showPin)}
        >
          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </motion.div>

      {showPin && pin && (
        <motion.p 
          className="text-muted-foreground mb-4 font-mono text-lg tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {pin}
        </motion.p>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-destructive mb-4 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Incorrect PIN. Please try again.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Number Pad */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <motion.button
            key={key || 'empty'}
            className={`w-16 h-16 rounded-xl text-xl font-medium transition-colors ${
              key === '' 
                ? 'invisible' 
                : key === 'del'
                ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            onClick={() => {
              if (key === 'del') handleDelete();
              else if (key) handlePinDigit(key);
            }}
            whileTap={{ scale: 0.95 }}
            disabled={key === '' || isValidating}
          >
            {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
          </motion.button>
        ))}
      </motion.div>

      {/* Sign Out Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          variant="ghost"
          size={tokens.button.inline}
          className="text-muted-foreground hover:text-foreground gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign out completely
        </Button>
      </motion.div>
    </motion.div>
  );
}

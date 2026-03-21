import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Loader2, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreateAdminAccountDialogProps {
  onSuccess?: () => void;
}

export function CreateAdminAccountDialog({ onSuccess }: CreateAdminAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [grantSuperAdmin, setGrantSuperAdmin] = useState(false);
  const [result, setResult] = useState<{ password: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setGrantSuperAdmin(false);
    setResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const copyCredentials = async () => {
    if (!result) return;
    const text = `Email: ${result.email}\nPassword: ${result.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Credentials copied to clipboard');
  };

  const createAccount = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('create-admin-account', {
        body: {
          email,
          fullName: fullName || undefined,
          password: password || undefined,
          grantSuperAdmin,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      setResult({ password: data.password, email: data.email });
      toast.success(data.message);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating admin account:', error);
      toast.error('Failed to create admin account', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="default" size={tokens.button.card} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Admin Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Admin Account</DialogTitle>
          <DialogDescription>
            Create a new admin account with pre-approved access. The account will be ready to use immediately.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                ✓ Account created successfully
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{result.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <p className="font-mono text-sm">{result.password}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size={tokens.button.card}
                className="w-full gap-2"
                onClick={copyCredentials}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Share these credentials securely with the user. They can change their password after logging in.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={resetForm}>
                Create Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="text"
                placeholder="Leave blank to auto-generate"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                If left blank, a secure password will be generated automatically.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="superAdmin"
                checked={grantSuperAdmin}
                onCheckedChange={(checked) => setGrantSuperAdmin(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="superAdmin" className="text-sm font-normal cursor-pointer">
                Grant Super Admin privileges
              </Label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={createAccount} disabled={isLoading || !email}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

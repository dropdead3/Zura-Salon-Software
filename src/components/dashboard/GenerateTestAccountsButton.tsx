import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FlaskConical, Loader2 } from 'lucide-react';
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

interface TestAccountResult {
  email: string;
  status: 'created' | 'already_exists' | 'error';
  error?: string;
}

export function GenerateTestAccountsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestAccountResult[] | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const generateAccounts = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('generate-test-accounts', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      setResults(data.results);
      setPassword(data.password);

      const created = data.results.filter((r: TestAccountResult) => r.status === 'created').length;
      const existing = data.results.filter((r: TestAccountResult) => r.status === 'already_exists').length;
      const errors = data.results.filter((r: TestAccountResult) => r.status === 'error').length;

      if (created > 0) {
        toast.success(`Created ${created} test account(s)`, {
          description: `Password: ${data.password}`
        });
      }
      if (existing > 0) {
        toast.info(`${existing} account(s) already existed`);
      }
      if (errors > 0) {
        toast.error(`${errors} account(s) failed to create`);
      }
    } catch (error) {
      console.error('Error generating test accounts:', error);
      toast.error('Failed to generate test accounts', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={tokens.button.card} className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Generate Test Accounts
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Test Accounts</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This will create test accounts for the following roles:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Manager</li>
              <li>Receptionist</li>
              <li>Stylist Assistant</li>
              <li>Admin Assistant</li>
              <li>Operations Assistant</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Stylist and Admin test accounts should be created manually to avoid security implications.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {results && (
          <div className="border rounded-lg p-3 bg-muted/50 text-sm space-y-2">
            <p className="font-medium">Results:</p>
            {results.map((r) => (
              <div key={r.email} className="flex items-center gap-2">
                <span className={
                  r.status === 'created' ? 'text-green-600' :
                  r.status === 'already_exists' ? 'text-amber-600' :
                  'text-red-600'
                }>
                  {r.status === 'created' ? '✓' : r.status === 'already_exists' ? '○' : '✗'}
                </span>
                <span className="truncate">{r.email}</span>
              </div>
            ))}
            {password && (
              <p className="mt-2 font-mono text-xs bg-background p-2 rounded">
                Password: {password}
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={generateAccounts} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              'Generate Accounts'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PixelZMark } from '@/components/ui/PixelZMark';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 rounded-2xl border border-border/50 bg-card/40 px-8 py-7">
          <PixelZMark className="mx-auto" />
        </div>

        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">404</p>
        <h1 className="mt-3 font-display text-xl tracking-[0.16em] uppercase">
          Page not found
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          The route <span className="text-foreground/80">{location.pathname}</span> does not exist.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate('/dashboard');
            }}
          >
            Go back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>Go home</Button>
        </div>
      </div>
    </div>
  );
}

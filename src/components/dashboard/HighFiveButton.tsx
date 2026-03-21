import { useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface HighFiveUser {
  id: string;
  user_id: string;
  user_name?: string;
  user_photo?: string | null;
}

interface HighFiveButtonProps {
  count: number;
  hasHighFived: boolean;
  users: HighFiveUser[];
  onToggle: () => void;
  disabled?: boolean;
}

export function HighFiveButton({
  count,
  hasHighFived,
  users,
  onToggle,
  disabled = false,
}: HighFiveButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    // If user hasn't high-fived yet, trigger confetti
    if (!hasHighFived && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      // Small, targeted confetti burst
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { x, y },
        colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
        scalar: 0.8,
        gravity: 1.2,
        ticks: 100,
      });

      // Add bounce animation
      buttonRef.current.classList.add('animate-bounce-once');
      setTimeout(() => {
        buttonRef.current?.classList.remove('animate-bounce-once');
      }, 300);
    }

    onToggle();
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={buttonRef}
              variant="outline"
              size={tokens.button.inline}
              onClick={handleClick}
              disabled={disabled}
              className={cn(
                'h-8 px-3 gap-2 font-sans text-xs rounded-full border-2 transition-all',
                hasHighFived
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 hover:border-amber-400',
                '[&.animate-bounce-once]:animate-[bounce-once_0.3s_ease-out]'
              )}
            >
              <Hand
                className={cn(
                  'w-4 h-4 transition-transform',
                  hasHighFived && 'scale-110 -rotate-12'
                )}
              />
              <span className="font-medium">
                {hasHighFived ? 'High-fived!' : 'Give a high-five!'}
              </span>
              {count > 0 && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                  hasHighFived 
                    ? 'bg-white/20 text-white' 
                    : 'bg-amber-200 text-amber-800'
                )}>
                  {count}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{hasHighFived ? 'Click to remove your high five' : 'Celebrate this win!'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {count > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex -space-x-1.5 hover:opacity-80 transition-opacity">
              {users.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={user.user_photo || undefined} alt={user.user_name} />
                  <AvatarFallback className="text-[9px] bg-amber-100 text-amber-700 font-medium">
                    {user.user_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {count > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[9px] font-medium">+{count - 3}</span>
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              High Fives ({count})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-2 px-1 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.user_photo || undefined} alt={user.user_name} />
                    <AvatarFallback className="text-[8px] bg-amber-100 text-amber-700">
                      {user.user_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-sans truncate">{user.user_name}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { CalendarClock, MessageCircleQuestion, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIHelpTab } from './help-fab/AIHelpTab';
import { ChatLeadershipTab } from './help-fab/ChatLeadershipTab';

export function HelpFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-help');
  const [bookingOpen, setBookingOpen] = useState(false);
  const location = useLocation();
  
  const isSchedulePage = location.pathname === '/dashboard/schedule';

  // Listen for booking popover open/close to hide FAB
  useEffect(() => {
    const handleBookingState = (e: Event) => {
      setBookingOpen((e as CustomEvent).detail?.open ?? false);
    };
    window.addEventListener('booking-popover-state', handleBookingState);
    return () => window.removeEventListener('booking-popover-state', handleBookingState);
  }, []);

  const handleCopilotToggle = useCallback(() => {
    if (isSchedulePage) {
      window.dispatchEvent(new CustomEvent('toggle-scheduling-copilot'));
    }
  }, [isSchedulePage]);
  
  // Hide on Team Chat page since it has its own AI panel
  if (location.pathname === '/dashboard/team-chat') {
    return null;
  }

  // Hide when booking popover is open on schedule page
  if (isSchedulePage && bookingOpen) {
    return null;
  }

  // On the schedule page, render a simple button that toggles the copilot panel
  if (isSchedulePage) {
    return (
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border border-border text-muted-foreground hover:text-foreground hover:bg-card/90 hover:scale-110"
              aria-label="AI Copilot"
              onClick={handleCopilotToggle}
            >
              <CalendarClock className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>AI Copilot</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    );
  }

  // On other pages, keep the existing popover behavior
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border border-border text-muted-foreground hover:text-foreground hover:bg-card/90 hover:scale-110"
            aria-label="Help & Support"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="help"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MessageCircleQuestion className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </PopoverTrigger>
      
      <PopoverContent
        side="top"
        align="end"
        sideOffset={16}
        className="w-[380px] h-[480px] p-0 overflow-hidden"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-muted/30 px-4 pt-3 pb-2">
            <TabsList>
              <TabsTrigger value="ai-help" className="flex-1">{AI_ASSISTANT_NAME_DEFAULT}</TabsTrigger>
              <TabsTrigger value="support" className="flex-1">Chat</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="ai-help" className="flex-1 m-0 overflow-hidden">
            <AIHelpTab />
          </TabsContent>
          
          <TabsContent value="support" className="flex-1 m-0 overflow-hidden">
            <ChatLeadershipTab />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

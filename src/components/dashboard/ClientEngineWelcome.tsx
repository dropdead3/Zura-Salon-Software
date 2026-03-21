import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Target, 
  Flame, 
  Heart, 
  Trophy, 
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  Star,
  Zap,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';
import { ColoredLogo } from './ColoredLogo';
import { useProgramConfig, useProgramRules, useDailyTasks, ProgramConfig } from '@/hooks/useProgramConfig';
import { useProgramOutcomes, ProgramOutcome } from '@/hooks/useProgramOutcomes';
import { icons } from 'lucide-react';

interface WelcomePageContent {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
}

interface ClientEngineWelcomeProps {
  onStartProgram: () => void;
  isPreview?: boolean;
  previewConfig?: ProgramConfig | null;
  contentOverrides?: WelcomePageContent;
}

export function ClientEngineWelcome({ onStartProgram, isPreview = false, previewConfig, contentOverrides }: ClientEngineWelcomeProps) {
  const { config: savedConfig } = useProgramConfig();
  const { rules } = useProgramRules();
  const { tasks } = useDailyTasks();
  const { data: outcomes = [] } = useProgramOutcomes();
  const [isHovered, setIsHovered] = useState(false);

  // ALWAYS use previewConfig when in preview mode (from parent's live state), otherwise use saved config from DB
  const config = isPreview && previewConfig ? previewConfig : (previewConfig || savedConfig);

  const totalDays = config?.total_days || 75;
  const totalPasses = config?.life_happens_passes_total || 2;
  const programName = config?.program_name || 'Client Engine';
  const logoUrl = config?.logo_url;
  const logoSize = config?.logo_size || 64;
  const logoColor = config?.logo_color;

  // Content with overrides - use config values, then overrides, then fallbacks
  const eyebrow = contentOverrides?.eyebrow || config?.welcome_eyebrow || '75-DAY TRANSFORMATION';
  const headline = contentOverrides?.headline || config?.welcome_headline || 'BUILD YOUR CLIENT ENGINE';
  const subheadline = contentOverrides?.subheadline || config?.welcome_subheadline || `${totalDays} days of focused execution. No shortcuts. No excuses. Transform your book and build a business that runs on autopilot.`;
  const ctaText = contentOverrides?.ctaText || config?.welcome_cta_text || "I'M READY — START DAY 1";

  const highlights = [
    {
      icon: Target,
      title: '75 Consecutive Days',
      description: 'Build unstoppable momentum with daily consistency'
    },
    {
      icon: Flame,
      title: 'Streak-Based System',
      description: 'Watch your progress compound day after day'
    },
    {
      icon: Heart,
      title: `${totalPasses} Life Happens Passes`,
      description: 'Grace for when life throws curveballs'
    },
    {
      icon: Trophy,
      title: 'Weekly Wins',
      description: 'Celebrate milestones every 7 days'
    }
  ];

  // Helper function to render dynamic icons
  const renderIcon = (iconName: string) => {
    const iconKey = iconName
      .split('-')
      .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('') as keyof typeof icons;
    const IconComponent = icons[iconKey] || icons['Sparkles'];
    return <IconComponent className="w-4 h-4 text-primary" />;
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="min-h-[80vh] flex items-center justify-center py-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex justify-center"
          >
            <ColoredLogo 
              logoUrl={logoUrl} 
              color={logoColor}
              size={logoSize}
              alt={programName}
            />
          </motion.div>
          
          <Badge variant="secondary" className="mb-8 px-4 py-1.5 text-xs tracking-wider font-display uppercase">
            <Sparkles className="w-3 h-3 mr-2" />
            {eyebrow}
          </Badge>
          
          <h1 className="font-display text-3xl lg:text-4xl tracking-wide mb-6 text-balance">
            {headline}
          </h1>
          
          <p className="text-muted-foreground font-sans text-lg max-w-xl mx-auto leading-relaxed mb-4">
            {subheadline}
          </p>
        </motion.div>

        {/* Highlights Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {highlights.map((highlight) => (
            <motion.div
              key={highlight.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-5 h-full bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <highlight.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display text-xs tracking-wide mb-1.5">{highlight.title}</h3>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">{highlight.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* The Commitment Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-8 mb-8 bg-gradient-to-br from-background via-card to-muted/20 border-border/50 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg tracking-wide">THE COMMITMENT</h2>
                <p className="text-xs text-muted-foreground">What you're signing up for</p>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Tasks Preview */}
              <div className="bg-muted/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-display text-sm tracking-wide">DAILY TASKS</span>
                </div>
                <ul className="space-y-2.5">
                  {tasks.slice(0, 5).map((task, i) => (
                    <li key={task.id} className="flex items-start gap-3 text-sm font-sans">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{task.label}</span>
                    </li>
                  ))}
                  {tasks.length > 5 && (
                    <li className="text-xs text-muted-foreground pl-8">
                      + {tasks.length - 5} more tasks
                    </li>
                  )}
                </ul>
              </div>

              {/* Rules Preview */}
              <div className="bg-muted/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="font-display text-sm tracking-wide">THE RULES</span>
                </div>
                <ul className="space-y-2.5">
                  {rules.slice(0, 5).map((rule) => (
                    <li key={rule.id} className="flex items-start gap-3 text-sm font-sans">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0 mt-0.5">
                        {rule.rule_number}
                      </span>
                      <span className="text-muted-foreground">{rule.rule_text}</span>
                    </li>
                  ))}
                  {rules.length > 5 && (
                    <li className="text-xs text-muted-foreground pl-8">
                      + {rules.length - 5} more rules
                    </li>
                  )}
                </ul>
              </div>
            </div>

          </Card>
        </motion.div>

        {/* The Outcome Section - Premium Bronze Gold */}
        <motion.div variants={itemVariants}>
          <Card className="relative p-6 md:p-8 bg-gradient-to-br from-[hsl(35,30%,12%)] via-[hsl(38,25%,18%)] to-[hsl(30,20%,8%)] border-[hsl(38,50%,35%)]/40 shadow-2xl overflow-hidden">
            {/* Subtle gold shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(42,60%,50%)]/5 to-transparent opacity-50" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(42,70%,45%)] to-[hsl(35,60%,35%)] flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-[hsl(45,100%,97%)]" />
                </div>
                <div>
                  <h2 className="font-display text-2xl tracking-wider text-[hsl(45,50%,92%)]">THE OUTCOME</h2>
                  <p className="text-sm text-[hsl(40,20%,65%)] font-sans">What you'll walk away with</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {outcomes.map((outcome) => (
                  <motion.div 
                    key={outcome.id} 
                    className="bg-[hsl(35,20%,15%)]/60 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 border border-[hsl(42,50%,40%)]/20 hover:border-[hsl(42,60%,50%)]/40 transition-colors duration-300"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(42,70%,50%)] to-[hsl(38,60%,40%)] flex items-center justify-center shrink-0 shadow-md">
                      <div className="text-[hsl(45,100%,97%)]">
                        {renderIcon(outcome.icon)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1 text-[hsl(45,40%,90%)]">{outcome.title}</p>
                      <p className="text-xs text-[hsl(40,15%,60%)]">{outcome.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Warning Banner - moved above CTA */}
        <motion.div variants={itemVariants} className="mt-8">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 max-w-2xl mx-auto">
            <Clock className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Only begin when you're ready</p>
              <p className="text-xs text-muted-foreground">
                This program requires {totalDays} consecutive days of execution. 
                Miss a day and you restart from Day 1. You get {totalPasses} Life Happens Passes—use them wisely.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div variants={itemVariants} className="text-center mt-8">
          <motion.div
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={isPreview ? undefined : onStartProgram}
              size={tokens.button.hero}
              className="font-display tracking-wider px-10 py-7 text-base bg-[hsl(0,0%,8%)] text-[hsl(40,30%,96%)] hover:bg-[hsl(0,0%,15%)] shadow-xl hover:shadow-2xl transition-all duration-300 group disabled:opacity-100 disabled:bg-[hsl(0,0%,8%)]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isPreview}
            >
              <Play className={`w-5 h-5 mr-3 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
              {ctaText}
              <ChevronRight className={`w-5 h-5 ml-2 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </Button>
          </motion.div>
          
          <p className="text-xs text-muted-foreground mt-4 font-sans">
            By starting, you're committing to {totalDays} days of growth.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

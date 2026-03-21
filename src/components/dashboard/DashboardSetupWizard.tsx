import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { 
  Sparkles, 
  Layout, 
  CheckCircle2, 
  ArrowRight, 
  Palette,
  BarChart3,
  Users,
  Calendar,
  Target,
} from 'lucide-react';
import { useDashboardTemplates, useCompleteSetup, DashboardLayout } from '@/hooks/useDashboardLayout';
import { cn } from '@/lib/utils';

interface DashboardSetupWizardProps {
  onComplete?: () => void;
  roleTemplateKey?: string;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  leadership: <BarChart3 className="w-5 h-5" />,
  stylist: <Target className="w-5 h-5" />,
  operations: <Calendar className="w-5 h-5" />,
  assistant: <Users className="w-5 h-5" />,
};

const TEMPLATE_COLORS: Record<string, string> = {
  leadership: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
  stylist: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
  operations: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
  assistant: 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
};

export function DashboardSetupWizard({ onComplete, roleTemplateKey }: DashboardSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(roleTemplateKey || null);
  const { data: templates, isLoading } = useDashboardTemplates();
  const completeSetup = useCompleteSetup();

  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
  };

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
    } else {
      // Complete setup with selected template
      const template = templates?.find(t => t.role_name === selectedTemplate);
      completeSetup.mutate(template?.layout, {
        onSuccess: () => {
          onComplete?.();
        },
      });
    }
  };

  const handleSkip = () => {
    // Complete setup with default/recommended template
    const template = templates?.find(t => t.role_name === roleTemplateKey);
    completeSetup.mutate(template?.layout, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-2xl"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="font-display text-3xl lg:text-4xl mb-4">
              Welcome to Your Dashboard
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Let's personalize your experience. Choose a layout that fits your role, 
              or customize it to match how you work.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size={tokens.button.hero} onClick={handleContinue} className="gap-2">
                Choose My Layout
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size={tokens.button.hero} variant="outline" onClick={handleSkip}>
                Use Recommended
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl"
          >
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Layout className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl mb-2">Choose Your Starting Layout</h2>
              <p className="text-muted-foreground">
                Select a template that matches your role. You can customize it anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {templates?.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'p-6 cursor-pointer transition-all duration-200 border-2',
                    'hover:shadow-lg hover:scale-[1.02]',
                    selectedTemplate === template.role_name
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-muted-foreground/20',
                    `bg-gradient-to-br ${TEMPLATE_COLORS[template.role_name] || 'from-muted/50 to-muted/30'}`
                  )}
                  onClick={() => handleSelectTemplate(template.role_name)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      'bg-background/80 backdrop-blur-sm'
                    )}>
                      {TEMPLATE_ICONS[template.role_name] || <Palette className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg">{template.display_name}</h3>
                        {selectedTemplate === template.role_name && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      {template.layout && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.layout.sections?.slice(0, 4).map((section) => (
                            <span 
                              key={section}
                              className="text-xs bg-background/60 px-2 py-0.5 rounded-full"
                            >
                              {section.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(template.layout.sections?.length || 0) > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{(template.layout.sections?.length || 0) - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedTemplate || completeSetup.isPending}
                className="gap-2"
              >
                {completeSetup.isPending ? 'Setting up...' : 'Apply & Continue'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { DemoChat } from '@/components/demo/DemoChat';
import { useProductDemo } from '@/hooks/useProductDemo';

export default function ProductDemo() {
  const navigate = useNavigate();
  const { messages, isLoading, sendQuestion, clearChat } = useProductDemo();

  const handleFeatureClick = (featureKey: string) => {
    // For now, could navigate to feature detail page or scroll to more info
    console.log('Feature clicked:', featureKey);
    // Future: navigate(`/demo/feature/${featureKey}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">{PLATFORM_NAME}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size={tokens.button.card} onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size={tokens.button.card} onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Intro section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-medium mb-3">
              See How We Solve Your Challenges
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Tell our AI consultant about your salon management pain points, and get personalized solutions instantly.
            </p>
          </div>

          {/* Chat interface */}
          <div className="bg-background rounded-2xl border shadow-lg overflow-hidden h-[600px] flex flex-col">
            <DemoChat
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendQuestion}
              onClearChat={clearChat}
              onFeatureClick={handleFeatureClick}
            />
          </div>

          {/* CTA section */}
          <div className="text-center mt-8 space-y-4">
            <p className="text-muted-foreground">
              Ready to transform your salon operations?
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size={tokens.button.hero} onClick={() => navigate('/register')}>
                Start Free Trial
              </Button>
              <Button variant="outline" size={tokens.button.hero} onClick={() => navigate('/contact')}>
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

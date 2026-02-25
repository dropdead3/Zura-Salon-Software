import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EditorCard } from './EditorCard';

interface LinkToManagerCardProps {
  title: string;
  description: string;
  linkHref: string;
  linkText: string;
}

export function LinkToManagerCard({ title, description, linkHref, linkText }: LinkToManagerCardProps) {
  return (
    <div className="max-w-2xl">
      <EditorCard title={title} description={description}>
        <Button asChild variant="outline">
          <Link to={linkHref} className="inline-flex items-center gap-2">
            {linkText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </EditorCard>
    </div>
  );
}

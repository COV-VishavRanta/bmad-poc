import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const Navigation: React.FC = () => {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground">
            B-MAD POC
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/posts" className="text-foreground hover:text-primary">
              Posts
            </Link>
            <Link href="/create" className="text-foreground hover:text-primary">
              Create
            </Link>
            <Link href="/drafts" className="text-foreground hover:text-primary">
              Drafts
            </Link>
            <Button asChild variant="outline">
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};


import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="p-4 rounded-full bg-destructive/10 mb-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      
      <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground text-lg mb-8">The page you are looking for doesn't exist or has been moved.</p>
      
      <Link to="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;

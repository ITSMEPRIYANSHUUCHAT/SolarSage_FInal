
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CustomerRecords from '@/components/CustomerRecords';
import { ChevronLeft, FileText } from 'lucide-react';

const Records: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background py-12 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col">
            <Link to="/" className="self-start">
              <Button variant="ghost" size="sm" className="gap-1 mb-6">
                <ChevronLeft className="h-4 w-4" />
                Back to Analyzer
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Customer Records</h1>
            </div>
            
            <p className="text-muted-foreground max-w-2xl">
              View all stored electricity bill insights and analysis data. Track usage patterns and savings opportunities over time.
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-8 px-4">  
        <CustomerRecords />
      </div>
    </div>
  );
};

export default Records;

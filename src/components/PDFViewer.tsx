
import React, { useState, useEffect } from 'react';
import { FileText, Maximize2, Minimize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  file: File;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Create URL for the PDF
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    
    // Cleanup function
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className={cn(
      'glass-card rounded-xl animate-appear overflow-hidden transition-all duration-300 ease-in-out',
      isFullscreen ? 'fixed inset-4 z-50' : 'relative w-full h-[500px]'
    )}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-2 text-primary" />
          <h3 className="font-medium truncate max-w-[200px]">{file.name}</h3>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="w-full h-[calc(100%-48px)]">
        {objectUrl && (
          <iframe 
            src={`${objectUrl}#view=FitH`}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
};

// For mobile, we use a dialog to show the PDF
const PDFViewerResponsive: React.FC<PDFViewerProps> = (props) => {
  const { file, onClose } = props;
  
  return (
    <>
      {/* Desktop version */}
      <div className="hidden md:block">
        <PDFViewer file={file} onClose={onClose} />
      </div>
      
      {/* Mobile version */}
      <div className="block md:hidden animate-appear">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] h-[80vh] max-w-none p-0">
            <div className="w-full h-full">
              <PDFViewer file={file} onClose={() => {}} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default PDFViewerResponsive;

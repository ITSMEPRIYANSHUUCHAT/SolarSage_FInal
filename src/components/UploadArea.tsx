
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface UploadAreaProps {
  onFileUploaded: (file: File) => void;
  isProcessing: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFileUploaded, isProcessing }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    
    onFileUploaded(file);
  }, [onFileUploaded]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        'relative w-full h-56 sm:h-72 rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out',
        'flex flex-col items-center justify-center p-6 sm:p-8 text-center',
        isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-secondary/50',
        isDragReject && 'border-destructive bg-destructive/5',
        isProcessing && 'opacity-70 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="mb-4">
        {isDragReject ? (
          <AlertCircle className="h-12 w-12 text-destructive animate-pulse-soft" />
        ) : (
          <div className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center bg-primary/10',
            'transition-all duration-300',
            isDragActive ? 'bg-primary/20 scale-110' : ''
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors duration-300',
              isDragActive ? 'text-primary' : 'text-primary/70'
            )} />
          </div>
        )}
      </div>
      
      <h3 className="text-base sm:text-lg font-medium mb-1">
        {isDragReject ? 'Unsupported File Format' : isProcessing ? 'Processing...' : 'Upload Your Electricity Bill'}
      </h3>
      
      <p className="text-muted-foreground mb-3 max-w-md">
        {isDragReject 
          ? 'Please upload a PDF file only'
          : isProcessing 
            ? 'Please wait while we analyze your bill'
            : 'Drag & drop your PDF file here, or click to browse'
        }
      </p>
      
      {!isDragReject && !isProcessing && (
        <div className="flex items-center text-xs text-muted-foreground">
          <FileText className="h-3 w-3 mr-1" />
          <span>Supports PDF up to 10MB</span>
        </div>
      )}
    </div>
  );
};

export default UploadArea;

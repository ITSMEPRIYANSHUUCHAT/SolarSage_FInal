
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import UploadArea from './UploadArea';
import { uploadPDF, processPDFWithAI } from '@/services/supabaseService';
import { toast } from 'sonner';
import { BillData } from '@/utils/pdfUtils';
import { InsightsData } from '@/utils/insightsGenerator';
import { CheckCircle, FileText, Brain, Database, Download, RefreshCw } from 'lucide-react';

interface ProcessingFlowProps {
  onProcessingComplete: (billData: BillData, insights: InsightsData) => void;
}

const ProcessingFlow: React.FC<ProcessingFlowProps> = ({ onProcessingComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [lastProcessedData, setLastProcessedData] = useState<{billData: BillData, insights: InsightsData} | null>(null);

  const steps = [
    { icon: FileText, title: "Upload PDF", description: "Processing your electricity bill" },
    { icon: Brain, title: "AI Analysis", description: "Extracting data with OpenAI" },
    { icon: Database, title: "Save Data", description: "Storing insights in database" },
    { icon: CheckCircle, title: "Complete", description: "Analysis ready for download" }
  ];

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setCurrentStep(0);
    setProgress(0);
    setFileName(file.name);
    setShowResults(false);

    try {
      // Step 1: Upload PDF
      setProgress(25);
      const { extractedText } = await uploadPDF(file);
      
      // Step 2: AI Processing
      setCurrentStep(1);
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
      
      // Step 3: Save to database
      setCurrentStep(2);
      setProgress(75);
      const result = await processPDFWithAI(extractedText, file.name);
      
      // Step 4: Complete
      setCurrentStep(3);
      setProgress(100);
      
      toast.success('PDF processed successfully!');
      setShowResults(true);
      setLastProcessedData(result);
      onProcessingComplete(result.billData, result.insights);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process PDF. Please try again.');
      setCurrentStep(0);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep(0);
    setProgress(0);
    setShowResults(false);
    setFileName('');
    setLastProcessedData(null);
  };

  const refreshAndUploadNew = () => {
    resetFlow();
    // Scroll to upload area
    const uploadElement = document.getElementById('upload-area');
    if (uploadElement) {
      uploadElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Refresh Button - Show when results are displayed */}
      {showResults && (
        <div className="flex justify-center">
          <Button 
            onClick={refreshAndUploadNew} 
            variant="outline" 
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Upload New Bill
          </Button>
        </div>
      )}

      <div id="upload-area">
        {!showResults ? (
          <>
            <UploadArea onFileUploaded={handleFileUpload} isProcessing={isProcessing} />
            
            {isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Processing: {fileName}
                  </CardTitle>
                  <CardDescription>
                    Please wait while we analyze your electricity bill
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  
                  <div className="grid gap-3">
                    {steps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === currentStep;
                      const isComplete = index < currentStep;
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-primary/10 border border-primary/20' 
                              : isComplete 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <Icon 
                            className={`h-5 w-5 ${
                              isActive ? 'text-primary animate-pulse' : 
                              isComplete ? 'text-green-600' : 'text-muted-foreground'
                            }`} 
                          />
                          <div>
                            <p className={`font-medium ${isActive ? 'text-primary' : isComplete ? 'text-green-700' : 'text-muted-foreground'}`}>
                              {step.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                          {isComplete && (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Analysis Complete!
              </CardTitle>
              <CardDescription>
                Your electricity bill has been processed and insights generated. The data has been preserved and you can view the analysis below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={refreshAndUploadNew} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Process Another Bill
                </Button>
                {lastProcessedData && (
                  <Button 
                    onClick={() => onProcessingComplete(lastProcessedData.billData, lastProcessedData.insights)}
                    variant="default"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    View Current Analysis
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProcessingFlow;

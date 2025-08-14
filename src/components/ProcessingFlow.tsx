
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Brain, Database, RefreshCw } from 'lucide-react';

interface ProcessingFlowProps {
  currentStep: 'upload' | 'extract' | 'analyze' | 'complete';
  uploadProgress: number;
  fileName: string;
}

const ProcessingFlow: React.FC<ProcessingFlowProps> = ({ 
  currentStep, 
  uploadProgress, 
  fileName 
}) => {
  const steps = [
    { id: 'upload', icon: FileText, title: "Upload PDF", description: "Processing your electricity bill" },
    { id: 'extract', icon: Brain, title: "Extract Data", description: "Reading bill information" },
    { id: 'analyze', icon: Brain, title: "AI Analysis", description: "Generating insights with AI" },
    { id: 'complete', icon: CheckCircle, title: "Complete", description: "Analysis ready" }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  return (
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
        <Progress value={uploadProgress} className="w-full" />
        
        <div className="grid gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const currentStepIndex = getCurrentStepIndex();
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            
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
  );
};

export default ProcessingFlow;

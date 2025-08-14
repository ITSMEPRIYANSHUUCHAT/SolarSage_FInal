
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadArea from '@/components/UploadArea';
import ProcessingFlow from '@/components/ProcessingFlow';
import ImprovedInsightsPanel from '@/components/ImprovedInsightsPanel';
import PDFViewer from '@/components/PDFViewer';
import UserMenu from '@/components/UserMenu';
import GuestModeNotice from '@/components/GuestModeNotice';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BillData } from '@/utils/pdfUtils';
import { InsightsData } from '@/utils/insightsGenerator';
import { uploadPDF, processPDFWithAI } from '@/services/supabaseService';
import { processPDFWithAIAsGuest } from '@/services/guestService';
import { Zap, Upload, FileText, BarChart3 } from 'lucide-react';

const Index = () => {
  const { isGuest, guestPdfCount, incrementGuestPdfCount } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'analyze' | 'complete'>('upload');
  const [billData, setBillData] = useState<BillData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (isGuest && guestPdfCount >= 3) {
      toast.error('Guest limit reached. Please sign up to analyze more bills.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('upload');
    setUploadProgress(0);
    setUploadedFile(file);
    setFileName(file.name);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      setCurrentStep('extract');
      
      if (isGuest) {
        // For guests, we'll simulate the process without actual AI processing
        setUploadProgress(100);
        setCurrentStep('analyze');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = await processPDFWithAIAsGuest('demo text', file.name, guestPdfCount);
        
        setBillData(result.billData);
        setInsights(result.insights);
        incrementGuestPdfCount();
        
        if (result.isLimitReached) {
          toast.warning('You have reached the guest limit. Sign up for unlimited access!');
        }
      } else {
        // Regular authenticated user flow
        const { extractedText } = await uploadPDF(file);
        setUploadProgress(100);
        
        setCurrentStep('analyze');
        const { billData: processedBillData, insights: processedInsights } = await processPDFWithAI(extractedText, file.name);
        
        setBillData(processedBillData);
        setInsights(processedInsights);
      }
      
      setCurrentStep('complete');
      toast.success('Electricity bill analyzed successfully!');
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process the PDF');
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewUpload = () => {
    setBillData(null);
    setInsights(null);
    setUploadedFile(null);
    setFileName('');
    setCurrentStep('upload');
    setUploadProgress(0);
  };

  const handleDownloadReport = async () => {
    if (!insights || !billData) return;
    
    setIsGeneratingDocument(true);
    try {
      // Import and use the InsightsDocument component
      const { default: InsightsDocument } = await import('@/components/InsightsDocument');
      
      // Create a temporary container for the component
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // This will trigger the PDF generation
      const React = await import('react');
      const ReactDOM = await import('react-dom/client');
      const root = ReactDOM.createRoot(container);
      
      root.render(
        React.createElement(InsightsDocument, {
          insights,
          fileName: fileName || 'solar-report',
          billData,
          onComplete: () => {
            root.unmount();
            document.body.removeChild(container);
            setIsGeneratingDocument(false);
          }
        })
      );
      
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
      setIsGeneratingDocument(false);
    }
  };

  const handleClosePDFViewer = () => {
    setUploadedFile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">SolarSage</h1>
              </div>
              {isGuest && (
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-medium">
                  Guest Mode
                </span>
              )}
            </div>
            {!isGuest && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isGuest && (
          <div className="mb-6">
            <GuestModeNotice />
          </div>
        )}

        {!billData && !insights ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                AI-Powered Electricity Bill Analysis
              </h2>
              <p className="text-muted-foreground text-lg">
                Upload your electricity bill and get instant insights, solar performance analysis, and cost optimization recommendations.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center p-6">
                <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Upload Bill</h3>
                <p className="text-sm text-muted-foreground">
                  Simply drag and drop your PDF electricity bill
                </p>
              </Card>
              <Card className="text-center p-6">
                <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI extracts and analyzes your consumption data
                </p>
              </Card>
              <Card className="text-center p-6">
                <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Get Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Receive personalized recommendations and insights
                </p>
              </Card>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                {isProcessing ? (
                  <ProcessingFlow 
                    currentStep={currentStep}
                    uploadProgress={uploadProgress}
                    fileName={fileName}
                  />
                ) : (
                  <UploadArea 
                    onFileUploaded={handleFileUpload}
                    isProcessing={false}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="insights" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="document">Original Bill</TabsTrigger>
                </TabsList>
                {!isGuest && (
                  <button
                    onClick={handleNewUpload}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Analyze New Bill
                  </button>
                )}
              </div>
              
              <TabsContent value="insights">
                {insights && (
                  <ImprovedInsightsPanel 
                    insights={insights}
                    onDownload={handleDownloadReport}
                    isGeneratingDocument={isGeneratingDocument}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="document">
                {uploadedFile && (
                  <PDFViewer 
                    file={uploadedFile} 
                    onClose={handleClosePDFViewer} 
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

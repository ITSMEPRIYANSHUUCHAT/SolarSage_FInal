
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProcessingFlow from '@/components/ProcessingFlow';
import { BillData } from '@/utils/pdfUtils';
import { InsightsData } from '@/utils/insightsGenerator';
import { generatePDF } from '@/utils/pdfGenerator';
import { FileText, BarChart3, Zap, TrendingUp, Download, Brain } from 'lucide-react';

const Index: React.FC = () => {
  const [billData, setBillData] = useState<BillData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  useEffect(() => {
    document.title = 'SolarSage — AI Electricity Bill Analyzer';
    const ensureMeta = (name: string) => {
      let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', name);
        document.head.appendChild(m);
      }
      return m;
    };
    ensureMeta('description')!.setAttribute(
      'content',
      'Upload your electricity bill PDF for AI-powered insights, solar performance, and savings opportunities with SolarSage.'
    );
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}/`);
  }, []);

  const handleProcessingComplete = (newBillData: BillData, newInsights: InsightsData) => {
    setBillData(newBillData);
    setInsights(newInsights);
  };
  const handleDownloadReport = () => {
    if (billData && insights) {
      const reportData = {
        name: 'Solar Customer',
        address: `${billData.location.latitude}, ${billData.location.longitude}`,
        month: insights.summary.billingPeriod.split(' - ')[0],
        consumption: billData.energyUsage.toString(),
        generation: billData.solarGeneration.toString(),
        savings: ((billData.solarGeneration || 0) * 0.15).toFixed(2),
        neighRank: 'Top 25%',
        topGen: insights.solar ? (insights.solar.efficiency > 80 ? 'Excellent' : 'Good') : 'Good',
        missedSavings: insights.solar?.potentialSavings?.toString() || '0',
        billingMode: 'Net Metering',
        latitude: billData.location.latitude,
        longitude: billData.location.longitude
      };
      
      generatePDF(reportData);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-primary/15 via-background to-background border-b border-border/40">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-5xl">
            <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="h-3.5 w-3.5 text-primary" />
              AI Energy Insights
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Analyze your electricity bill with AI
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl">
              Upload a PDF of your utility bill to get clear insights on usage, solar performance, and potential savings. No simulations — real data only.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#upload">
                <Button className="gap-2">
                  <FileText className="h-4 w-4" />
                  Upload your bill
                </Button>
              </a>
              <Link to="/records">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  View Records
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Accurate usage trends
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Solar efficiency insights
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Actionable recommendations
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div id="upload" />
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Your Electricity Bill
              </CardTitle>
              <CardDescription>
                Upload a PDF of your electricity bill to get started with AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessingFlow onProcessingComplete={handleProcessingComplete} />
            </CardContent>
          </Card>

          {/* Only show insights if we have real data from PDF processing */}
          {billData && insights && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bill</p>
                        <p className="text-2xl font-bold">₹{insights.summary.totalAmount.toFixed(2)}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Usage</p>
                        <p className="text-2xl font-bold">{insights.usage.current} kWh</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Solar Generated</p>
                        <p className="text-2xl font-bold">{billData.solarGeneration} kWh</p>
                      </div>
                      <Zap className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                        <p className="text-2xl font-bold">{insights.solar?.efficiency.toFixed(1)}%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Solar Performance */}
              {insights.solar && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      Solar Performance Analysis
                    </CardTitle>
                    <CardDescription>
                      Based on weather data and your actual generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Actual Generation</p>
                        <p className="text-xl font-bold">{insights.solar.actualGeneration} kWh</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Ideal Generation</p>
                        <p className="text-xl font-bold">{insights.solar.idealGeneration.toFixed(0)} kWh</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                        <p className="text-xl font-bold text-green-600">{insights.solar.efficiency.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    {insights.solar.efficiency < 80 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800">Optimization Opportunity</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your panels could generate an additional {insights.solar.potentialSavings.toFixed(0)} kWh 
                          with optimal performance. Consider panel cleaning or maintenance.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>
                    AI-powered analysis of your electricity usage and billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.insights.map((insight, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          insight.type === 'warning' 
                            ? 'bg-yellow-50 border-yellow-400' 
                            : insight.type === 'tip'
                            ? 'bg-green-50 border-green-400'
                            : 'bg-blue-50 border-blue-400'
                        }`}
                      >
                        <h3 className="font-medium mb-2">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Download Report */}
              <Card>
                <CardHeader>
                  <CardTitle>Download Report</CardTitle>
                  <CardDescription>
                    Get a comprehensive PDF report of your electricity bill analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleDownloadReport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Feature Preview - Show only when no PDF has been processed */}
          {!billData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">AI Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced AI extracts key data from your electricity bill automatically
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="p-3 rounded-full bg-green-100 w-fit mx-auto">
                      <Zap className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Solar Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Get detailed analysis of your solar panel performance and efficiency
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="p-3 rounded-full bg-blue-100 w-fit mx-auto">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Usage Trends</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your energy consumption patterns and identify savings opportunities
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

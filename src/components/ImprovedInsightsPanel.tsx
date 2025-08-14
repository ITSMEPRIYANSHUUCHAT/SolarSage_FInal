
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Sun, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';
import { InsightsData } from '@/utils/insightsGenerator';
import SolarComparator from './SolarComparator';

interface ImprovedInsightsPanelProps {
  insights: InsightsData;
  onDownload?: () => void;
  isGeneratingDocument?: boolean;
}

const ImprovedInsightsPanel: React.FC<ImprovedInsightsPanelProps> = ({ 
  insights, 
  onDownload,
  isGeneratingDocument = false
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'tip':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightCardStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800';
      case 'tip':
        return 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bill Amount</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(insights.summary.totalAmount)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Energy Usage</p>
                <p className="text-3xl font-bold text-foreground">{insights.usage.current}</p>
                <p className="text-xs text-muted-foreground">kWh this month</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                <p className="text-3xl font-bold text-foreground">{insights.usage.averageDaily}</p>
                <p className="text-xs text-muted-foreground">kWh per day</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usage Change</p>
                <p className={`text-3xl font-bold flex items-center gap-1 ${
                  insights.usage.change >= 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {insights.usage.change >= 0 ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )}
                  {Math.abs(insights.usage.change).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solar Performance Section */}
      {insights.solar && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Sun className="h-6 w-6" />
              Solar Performance Analysis
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Your solar panels generated {insights.solar.actualGeneration} kWh this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Efficiency Rating</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {insights.solar.efficiency.toFixed(1)}%
                </p>
                <Progress 
                  value={insights.solar.efficiency > 100 ? 100 : insights.solar.efficiency} 
                  className="mt-2" 
                />
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Actual Generation</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {insights.solar.actualGeneration} kWh
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Expected Generation</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {insights.solar.idealGeneration.toFixed(0)} kWh
                </p>
              </div>
            </div>

            {insights.solar.efficiency < 80 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  Performance Alert
                </h4>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  Your solar panels are performing below optimal levels. Consider panel cleaning, 
                  maintenance check, or system inspection to improve performance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="insights" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="insights">Key Insights</TabsTrigger>
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="comparator">Solar Ranking</TabsTrigger>
            <TabsTrigger value="recommendations">Tips</TabsTrigger>
          </TabsList>
          
          {onDownload && (
            <Button onClick={onDownload} disabled={isGeneratingDocument} className="gap-2">
              {isGeneratingDocument ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Report
                </>
              )}
            </Button>
          )}
        </div>

        <TabsContent value="insights" className="space-y-4">
          {insights.insights.map((insight, index) => (
            <Card key={index} className={getInsightCardStyle(insight.type)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.value && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">
                          Current: {typeof insight.value === 'number' ? insight.value.toFixed(1) : insight.value}
                        </Badge>
                        {insight.compareValue && (
                          <Badge variant="secondary">
                            Compare: {typeof insight.compareValue === 'number' ? insight.compareValue.toFixed(1) : insight.compareValue}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of your electricity bill charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(insights.costs.breakdown).map(([category, amount]) => {
                  const percentage = ((amount / insights.summary.totalAmount) * 100).toFixed(1);
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{category}</p>
                        <p className="text-sm text-muted-foreground">{percentage}% of total bill</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                <p className="font-semibold text-foreground">Total Amount</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(insights.summary.totalAmount)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparator" className="space-y-4">
          {insights.solar ? (
            <SolarComparator insights={insights} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Sun className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Solar Data Available</h3>
                <p className="text-muted-foreground">
                  Solar comparison features are available when solar generation data is detected in your bill.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-200">Energy Efficiency Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Use energy-efficient LED bulbs and appliances to reduce consumption
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Set AC temperature to 24-26°C for optimal energy savings
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Unplug electronic devices when not in use to avoid standby power consumption
                  </p>
                </div>
              </CardContent>
            </Card>

            {insights.solar && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-800 dark:text-amber-200">Solar Optimization Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Sun className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Clean solar panels monthly to maintain optimal efficiency
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sun className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Schedule high-energy activities during peak solar hours (10 AM - 3 PM)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sun className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Monitor system performance regularly and address any issues promptly
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedInsightsPanel;

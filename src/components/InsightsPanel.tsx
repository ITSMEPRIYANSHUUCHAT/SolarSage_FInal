
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Info, AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Minus, BarChart2, PieChart, LineChart, Zap, DollarSign, Sun, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsightsData, Insight } from '@/utils/insightsGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';

interface InsightsPanelProps {
  insights: InsightsData;
  onDownload: () => void;
  isGeneratingDocument: boolean;
}

const InsightCard: React.FC<{ insight: Insight; delay: number }> = ({ insight, delay }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-green-400" />;
      default:
        return null;
    }
  };
  
  const getChangeIcon = () => {
    if (!insight.change) return null;
    
    if (insight.change > 0) {
      return <TrendingUp className="h-4 w-4 text-red-400" />;
    } else if (insight.change < 0) {
      return <TrendingDown className="h-4 w-4 text-green-400" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };
  
  return (
    <Card className={cn(
      "backdrop-blur-sm bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300 hover:scale-105",
      `animate-appear-delay-${delay}`,
      insight.type === 'warning' && 'border-l-amber-400 border-l-4',
      insight.type === 'tip' && 'border-l-green-400 border-l-4',
      insight.type === 'info' && 'border-l-blue-400 border-l-4'
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-white">
          {getIcon()}
          {insight.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-300">{insight.description}</p>
        
        {insight.value !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="text-xl font-semibold text-white">
              {typeof insight.value === 'number' ? 
                insight.value % 1 === 0 ? insight.value : insight.value.toFixed(2) : 
                insight.value}
              {insight.title.toLowerCase().includes('usage') && ' kWh'}
              {insight.title.toLowerCase().includes('cost') || insight.title.toLowerCase().includes('savings') && ' ₹'}
            </div>
            
            {insight.change !== undefined && (
              <div className="flex items-center text-sm">
                {getChangeIcon()}
                <span className={cn(
                  'ml-1',
                  insight.change > 0 ? 'text-red-400' : 
                  insight.change < 0 ? 'text-green-400' : 'text-gray-400'
                )}>
                  {Math.abs(insight.change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, onDownload, isGeneratingDocument }) => {
  // Enhanced chart data with more realistic patterns
  const usageComparisonData = [
    { name: 'Current Period', usage: insights.usage.current, fill: '#3b82f6' },
    { name: 'Previous Period', usage: insights.usage.previous, fill: '#6b7280' },
  ];

  // Generate more realistic daily usage data with patterns
  const daysInBilling = 30;
  const dailyUsageData = Array.from({ length: daysInBilling }, (_, i) => {
    const day = i + 1;
    const baseUsage = insights.usage.averageDaily;
    
    // Add realistic patterns: higher usage on weekends and evenings
    const isWeekend = day % 7 === 0 || day % 7 === 6;
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;
    
    // Add some seasonal variation
    const seasonalVariation = Math.sin((day / 30) * Math.PI * 2) * 0.1;
    
    // Random daily variation
    const randomVariation = (Math.random() - 0.5) * 0.3;
    
    const usage = baseUsage * weekendMultiplier * (1 + seasonalVariation + randomVariation);
    
    return {
      day: day,
      usage: Number(usage.toFixed(1)),
      solar: insights.solar ? Number((insights.solar.actualGeneration / 30 * (0.8 + Math.random() * 0.4)).toFixed(1)) : 0
    };
  });

  // Enhanced cost breakdown with more categories
  const costBreakdownData = Object.entries(insights.costs.breakdown).map(([name, value], index) => ({
    name,
    value,
    fill: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]
  }));
  
  // Solar efficiency data
  const solarEfficiencyData = insights.solar ? [
    { name: 'Current Efficiency', value: insights.solar.efficiency, fill: '#10b981' },
    { name: 'Potential Improvement', value: Math.max(0, 100 - insights.solar.efficiency), fill: '#374151' }
  ] : [];

  // Monthly trends data
  const monthlyTrends = [
    { month: 'Jan', consumption: 820, generation: 280, savings: 42 },
    { month: 'Feb', consumption: 780, generation: 320, savings: 48 },
    { month: 'Mar', consumption: 850, generation: 380, savings: 57 },
    { month: 'Apr', consumption: 920, generation: 420, savings: 63 },
    { month: 'May', consumption: insights.usage.current, generation: insights.solar?.actualGeneration || 0, savings: parseFloat((insights.solar?.potentialSavings || 0).toString()) },
    { month: 'Jun', consumption: 1050, generation: 480, savings: 72 }
  ];

  // Custom tooltip to show rupees
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.toLowerCase().includes('savings') || entry.name.toLowerCase().includes('cost') ? '₹' : ''}{entry.value}
              {entry.name.toLowerCase().includes('usage') || entry.name.toLowerCase().includes('consumption') || entry.name.toLowerCase().includes('generation') ? ' kWh' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-8">
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 hover:from-blue-600/30 hover:to-blue-800/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Amount</p>
                <p className="text-xl font-bold text-white">₹{insights.summary.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 hover:from-green-600/30 hover:to-green-800/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Energy Used</p>
                <p className="text-xl font-bold text-white">{insights.usage.current} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30 hover:from-yellow-600/30 hover:to-yellow-800/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sun className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Solar Generated</p>
                <p className="text-xl font-bold text-white">{insights.solar?.actualGeneration || 0} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 hover:from-purple-600/30 hover:to-purple-800/30 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Efficiency</p>
                <p className="text-xl font-bold text-white">{insights.solar?.efficiency.toFixed(1) || 'N/A'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Enhanced Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Comparison */}
        <Card className="backdrop-blur-sm bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Usage Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[260px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown Pie Chart */}
        <Card className="backdrop-blur-sm bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Cost Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[260px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage and Solar Generation */}
      <Card className="backdrop-blur-sm bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-white">Daily Usage & Solar Generation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] sm:h-[320px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyUsageData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="solar"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Solar Efficiency Radial Chart */}
      {insights.solar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur-sm bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-white">Solar Efficiency</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[260px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ efficiency: insights.solar.efficiency }]}>
                    <RadialBar dataKey="efficiency" cornerRadius={10} fill="#10b981" />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-2xl font-bold">
                      {insights.solar.efficiency.toFixed(1)}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card className="backdrop-blur-sm bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">6-Month Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[260px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="generation" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                    <Line type="monotone" dataKey="savings" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Key Insights */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-white">AI-Generated Insights</h2>
          <Button 
            onClick={onDownload} 
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
            disabled={isGeneratingDocument}
          >
            <Download className="h-4 w-4" />
            <span>{isGeneratingDocument ? 'Generating Report...' : 'Download PDF Report'}</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.insights.map((insight, index) => (
            <InsightCard 
              key={index} 
              insight={insight} 
              delay={(index % 3) + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;


import { BillData } from "./pdfUtils";
import { getSolarInsights } from "./solcastApi";

export interface Insight {
  title: string;
  description: string;
  type: "info" | "warning" | "tip";
  value?: number | string;
  compareValue?: number | string;
  change?: number; // percentage change
}

export interface SolarEfficiency {
  efficiency: number;
  idealGeneration: number;
  actualGeneration: number;
  potentialSavings: number;
}

export interface InsightsData {
  summary: {
    totalAmount: number;
    dueDate: string;
    billingPeriod: string;
  };
  usage: {
    current: number;
    previous: number;
    change: number;
    averageDaily: number;
  };
  costs: {
    breakdown: {
      [key: string]: number;
    };
    largestExpense: string;
  };
  solar?: SolarEfficiency;
  insights: Insight[];
}

export const generateInsights = async (billData: BillData): Promise<InsightsData> => {
  // Calculate usage change percentage
  const usageChange = ((billData.energyUsage - billData.previousUsage) / billData.previousUsage) * 100;
  
  // Find largest expense category
  let largestExpense = "";
  let maxCharge = 0;
  
  Object.entries(billData.charges).forEach(([category, amount]) => {
    if (amount > maxCharge) {
      maxCharge = amount;
      largestExpense = category;
    }
  });
  
  // Generate insights
  const insights: Insight[] = [];
  
  // Usage insight
  if (usageChange > 10) {
    insights.push({
      title: "Usage Increase Alert",
      description: `Your energy usage has increased by ${usageChange.toFixed(1)}% compared to last month.`,
      type: "warning",
      value: billData.energyUsage,
      compareValue: billData.previousUsage,
      change: usageChange
    });
  } else if (usageChange < -10) {
    insights.push({
      title: "Usage Reduction",
      description: `Great job! Your energy usage has decreased by ${Math.abs(usageChange).toFixed(1)}% compared to last month.`,
      type: "info",
      value: billData.energyUsage,
      compareValue: billData.previousUsage,
      change: usageChange
    });
  }
  
  // Daily usage insight
  insights.push({
    title: "Daily Consumption",
    description: `Your average daily consumption is ${billData.averageDailyUsage} kWh.`,
    type: "info",
    value: billData.averageDailyUsage
  });
  
  // Cost breakdown insight
  insights.push({
    title: "Main Cost Driver",
    description: `${largestExpense} makes up ${((maxCharge / billData.totalAmount) * 100).toFixed(1)}% of your total bill.`,
    type: "info",
    value: maxCharge,
    compareValue: billData.totalAmount
  });
  
  // Rate tier insight
  if (billData.energyUsage > 500) {
    insights.push({
      title: "Rate Tier Impact",
      description: "Your usage has entered the higher rate tier, which increases your cost per kWh.",
      type: "tip",
      value: billData.rates["Tier 2 (501+ kWh)"],
      compareValue: billData.rates["Tier 1 (0-500 kWh)"]
    });
  }
  
  // Get solar insights
  let solarData = null;
  if (billData.solarGeneration > 0) {
    solarData = await getSolarInsights(
      billData.location,
      billData.billingPeriod,
      billData.solarGeneration
    );
    
    if (solarData) {
      // Add solar efficiency insight
      insights.push({
        title: "Solar Efficiency",
        description: `Your solar panels are operating at ${solarData.efficiency.toFixed(1)}% efficiency compared to ideal forecasted production.`,
        type: solarData.efficiency < 70 ? "warning" : "info",
        value: solarData.efficiency,
        compareValue: 100
      });
      
      // Add potential savings insight
      if (solarData.potentialSavings > 50) {
        insights.push({
          title: "Optimization Opportunity",
          description: `You could generate an additional ${solarData.potentialSavings.toFixed(0)} kWh with optimal solar panel performance.`,
          type: "tip",
          value: solarData.potentialSavings
        });
      }
    }
  }
  
  // Create the full insights data structure
  return {
    summary: {
      totalAmount: billData.totalAmount,
      dueDate: billData.dueDate,
      billingPeriod: billData.billingPeriod
    },
    usage: {
      current: billData.energyUsage,
      previous: billData.previousUsage,
      change: usageChange,
      averageDaily: billData.averageDailyUsage
    },
    costs: {
      breakdown: billData.charges,
      largestExpense
    },
    solar: solarData,
    insights
  };
};

export const generateDocumentHTML = (insights: InsightsData): string => {
  // In a real implementation, we would generate a proper HTML document
  // For demo purposes, we'll create a simple template
  return `
    <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
          h1 { color: #0066cc; margin-bottom: 1.5rem; }
          h2 { color: #0066cc; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
          .summary { display: flex; justify-content: space-between; background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 1.5rem; font-weight: bold; color: #0066cc; }
          .summary-label { font-size: 0.875rem; color: #666; }
          .insight { margin-bottom: 1.5rem; padding: 1rem; border-radius: 8px; border-left: 4px solid #0066cc; background: #f5f9ff; }
          .insight.warning { border-left-color: #e67700; background: #fff9f5; }
          .insight.tip { border-left-color: #16a34a; background: #f0fdf4; }
          .insight-title { font-weight: 600; margin-bottom: 0.5rem; }
          .chart { width: 100%; height: 200px; background: #f5f5f5; border-radius: 8px; margin: 1.5rem 0; display: flex; align-items: center; justify-content: center; color: #999; }
          table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
          th { text-align: left; padding: 0.75rem; border-bottom: 2px solid #eee; }
          td { padding: 0.75rem; border-bottom: 1px solid #eee; }
          .solar-section { background: #f0f8ff; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
          .progress-container { width: 100%; background-color: #e0e0e0; border-radius: 10px; margin: 1rem 0; }
          .progress-bar { height: 20px; border-radius: 10px; background-color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Electricity Bill Insights</h1>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">$${insights.summary.totalAmount.toFixed(2)}</div>
              <div class="summary-label">Total Amount</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${insights.usage.current} kWh</div>
              <div class="summary-label">Total Usage</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${insights.usage.averageDaily} kWh</div>
              <div class="summary-label">Daily Average</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${insights.summary.dueDate}</div>
              <div class="summary-label">Due Date</div>
            </div>
          </div>
          
          ${insights.solar ? `
          <div class="solar-section">
            <h2>Solar Performance Analysis</h2>
            <p>Your solar panels generated <strong>${insights.solar.actualGeneration} kWh</strong> during this billing period.</p>
            <p>Based on weather data and forecasts from Solcast, the ideal generation would have been <strong>${insights.solar.idealGeneration.toFixed(0)} kWh</strong>.</p>
            
            <h3>Efficiency Rating: ${insights.solar.efficiency.toFixed(1)}%</h3>
            <div class="progress-container">
              <div class="progress-bar" style="width: ${insights.solar.efficiency > 100 ? 100 : insights.solar.efficiency}%;"></div>
            </div>
            
            ${insights.solar.efficiency < 80 ? `
              <div class="insight warning">
                <div class="insight-title">Optimization Opportunity</div>
                <p>Your solar panels are performing below optimal levels. You could generate an additional ${insights.solar.potentialSavings.toFixed(0)} kWh with improved efficiency.</p>
                <p>Consider panel cleaning, maintenance check, or system inspection to improve performance.</p>
              </div>
            ` : `
              <div class="insight tip">
                <div class="insight-title">Great Performance</div>
                <p>Your solar panels are performing well compared to forecasted potential.</p>
              </div>
            `}
          </div>
          ` : ''}
          
          <h2>Key Insights</h2>
          ${insights.insights.map(insight => `
            <div class="insight ${insight.type}">
              <div class="insight-title">${insight.title}</div>
              <div>${insight.description}</div>
            </div>
          `).join('')}
          
          <h2>Usage Analysis</h2>
          <div class="chart">Usage chart would appear here in a real implementation</div>
          <p>Your electricity usage was ${insights.usage.current} kWh during the billing period ${insights.summary.billingPeriod}, 
             which is ${Math.abs(insights.usage.change).toFixed(1)}% ${insights.usage.change >= 0 ? 'higher' : 'lower'} than your previous bill.</p>
          
          <h2>Cost Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(insights.costs.breakdown).map(([category, amount]) => `
                <tr>
                  <td>${category}</td>
                  <td>$${amount.toFixed(2)}</td>
                  <td>${((amount / insights.summary.totalAmount) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};

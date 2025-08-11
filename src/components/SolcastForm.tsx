
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sun } from 'lucide-react';

// Sample data for the solar performance chart
const solarData = [
  { month: 'Jan', generation: 320 },
  { month: 'Feb', generation: 380 },
  { month: 'Mar', generation: 420 },
  { month: 'Apr', generation: 480 },
  { month: 'May', generation: 520 },
  { month: 'Jun', generation: 580 },
  { month: 'Jul', generation: 620 },
  { month: 'Aug', generation: 590 },
  { month: 'Sep', generation: 540 },
  { month: 'Oct', generation: 480 },
  { month: 'Nov', generation: 400 },
  { month: 'Dec', generation: 350 },
];

export const SolcastForm: React.FC = () => {
  return (
    <div className="mt-12">
      <Card className="border-border/40 bg-gradient-to-br from-background to-accent/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            <CardTitle>Solar Performance Analysis</CardTitle>
          </div>
          <CardDescription>
            Historical solar panel performance data based on your location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={solarData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value) => [`${value} kWh`, 'Generation']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar dataKey="generation" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-muted-foreground text-sm mt-4">
            The chart shows the estimated solar generation for a typical system in your location
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SolcastForm;

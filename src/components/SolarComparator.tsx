
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Target, Users, MapPin } from 'lucide-react';
import { InsightsData } from '@/utils/insightsGenerator';

interface SolarComparatorProps {
  insights: InsightsData;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface RankingData {
  id: string;
  name: string;
  score: number;
  actualGeneration: number;
  expectedGeneration: number;
  systemSize: number;
  location: string;
  isCurrentUser?: boolean;
}

interface HistoricalData {
  month: string;
  score: number;
  actualGeneration: number;
  expectedGeneration: number;
}

const SolarComparator: React.FC<SolarComparatorProps> = ({ insights, userLocation }) => {
  const [rankingData, setRankingData] = useState<RankingData[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<'neighborhood' | 'city'>('neighborhood');

  // Calculate user's solar performance score
  const calculateScore = (actual: number, expected: number): number => {
    if (expected === 0) return 0;
    return Math.round((actual / expected) * 100);
  };

  const calculateMissedGeneration = (expected: number, actual: number): number => {
    return Math.max(0, expected - actual);
  };

  const calculateLossPercentage = (missed: number, expected: number): number => {
    if (expected === 0) return 0;
    return Math.round((missed / expected) * 100);
  };

  useEffect(() => {
    // Mock data generation for demonstration
    const generateMockRankingData = (): RankingData[] => {
      const baseData = [
        { name: 'Solar Home A', systemSize: 5.2, location: 'Nearby' },
        { name: 'Solar Home B', systemSize: 4.8, location: 'Nearby' },
        { name: 'Solar Home C', systemSize: 6.0, location: 'Nearby' },
        { name: 'Solar Home D', systemSize: 3.5, location: 'Same Block' },
        { name: 'Solar Home E', systemSize: 7.2, location: 'Adjacent Area' },
        { name: 'Solar Home F', systemSize: 4.0, location: 'Same Block' },
        { name: 'Solar Home G', systemSize: 5.8, location: 'Nearby' },
        { name: 'Solar Home H', systemSize: 4.5, location: 'Adjacent Area' }
      ];

      const mockData = baseData.map((home, index) => {
        const expectedGeneration = home.systemSize * 150; // Mock expected generation
        const variability = 0.7 + (Math.random() * 0.6); // 70% to 130% efficiency
        const actualGeneration = expectedGeneration * variability;
        const score = calculateScore(actualGeneration, expectedGeneration);

        return {
          id: `home-${index}`,
          name: home.name,
          score,
          actualGeneration: Math.round(actualGeneration),
          expectedGeneration: Math.round(expectedGeneration),
          systemSize: home.systemSize,
          location: home.location,
          isCurrentUser: false
        };
      });

      // Add current user data
      if (insights.solar) {
        const userScore = calculateScore(insights.solar.actualGeneration, insights.solar.idealGeneration);
        mockData.push({
          id: 'current-user',
          name: 'Your System',
          score: userScore,
          actualGeneration: insights.solar.actualGeneration,
          expectedGeneration: insights.solar.idealGeneration,
          systemSize: 5.0, // Mock system size
          location: 'Your Location',
          isCurrentUser: true
        });
      }

      // Sort by score (descending)
      return mockData.sort((a, b) => b.score - a.score);
    };

    const generateHistoricalData = (): HistoricalData[] => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map(month => {
        const expected = 450 + (Math.random() * 100);
        const actual = expected * (0.75 + Math.random() * 0.35);
        return {
          month,
          score: calculateScore(actual, expected),
          actualGeneration: Math.round(actual),
          expectedGeneration: Math.round(expected)
        };
      });
    };

    const ranking = generateMockRankingData();
    setRankingData(ranking);
    setHistoricalData(generateHistoricalData());
    
    // Find user rank
    const userIndex = ranking.findIndex(item => item.isCurrentUser);
    setUserRank(userIndex + 1);
  }, [insights]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 75) return 'secondary';
    return 'destructive';
  };

  const currentUserData = rankingData.find(item => item.isCurrentUser);
  const missedGeneration = currentUserData ? 
    calculateMissedGeneration(currentUserData.expectedGeneration, currentUserData.actualGeneration) : 0;
  const lossPercentage = currentUserData ? 
    calculateLossPercentage(missedGeneration, currentUserData.expectedGeneration) : 0;

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-2xl font-bold">#{userRank}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Performance Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(currentUserData?.score || 0)}`}>
                  {currentUserData?.score || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Missed Generation</p>
                <p className="text-2xl font-bold text-red-600">{missedGeneration} kWh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Efficiency Loss</p>
                <p className="text-2xl font-bold text-red-600">{lossPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Suggestions */}
      {(currentUserData?.score || 0) < 90 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Performance Improvement Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Consider cleaning solar panels to improve efficiency</li>
              <li>• Check for shading issues from nearby trees or structures</li>
              <li>• Schedule an inverter performance check</li>
              <li>• Optimize energy usage during peak solar hours</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leaderboard">Neighborhood Leaderboard</TabsTrigger>
          <TabsTrigger value="trends">Historical Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Solar Performance Rankings
                  </CardTitle>
                  <CardDescription>
                    Compare your solar generation performance with nearby systems
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedFilter === 'neighborhood' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('neighborhood')}
                  >
                    Neighborhood
                  </Button>
                  <Button
                    variant={selectedFilter === 'city' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('city')}
                  >
                    City
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rankingData.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.isCurrentUser ? 'bg-primary/5 border-primary' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className={`font-medium ${item.isCurrentUser ? 'text-primary' : ''}`}>
                          {item.name}
                          {item.isCurrentUser && (
                            <Badge variant="outline" className="ml-2">You</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location} • {item.systemSize} kW System
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getScoreBadgeVariant(item.score)}>
                        {item.score}% Score
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.actualGeneration} / {item.expectedGeneration} kWh
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Track your solar system performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Comparison</CardTitle>
              <CardDescription>
                Actual vs Expected generation over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Bar dataKey="expectedGeneration" fill="hsl(var(--muted))" name="Expected" />
                    <Bar dataKey="actualGeneration" fill="hsl(var(--primary))" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SolarComparator;

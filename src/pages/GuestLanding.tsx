
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Zap, Brain, TrendingUp, FileText, Clock, Users } from 'lucide-react';

const GuestLanding: React.FC = () => {
  const { enterGuestMode } = useAuth();
  const navigate = useNavigate();

  const handleTryAsGuest = () => {
    enterGuestMode();
    navigate('/');
  };

  const handleSignUp = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-primary/15 via-background to-background border-b border-border/40">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap className="h-3.5 w-3.5 text-primary" />
              AI Energy Insights Platform
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Transform Your Electricity Bills into 
              <span className="text-primary"> Smart Insights</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Upload your electricity bill and get instant AI-powered analysis, solar performance insights, 
              and personalized recommendations to save money and energy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button onClick={handleTryAsGuest} size="lg" className="text-lg px-8 py-6">
                <FileText className="mr-2 h-5 w-5" />
                Try Free (3 Bills)
              </Button>
              <Button onClick={handleSignUp} variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign Up for Unlimited
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Instant Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>AI Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Trusted by 1000+ Users</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <main className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What You'll Get</h2>
            <p className="text-muted-foreground">
              Comprehensive insights from your electricity bills in seconds
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader className="text-center">
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Smart Bill Analysis</CardTitle>
                <CardDescription>
                  AI extracts key data from your bills and identifies patterns in your energy usage
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Zap className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Solar Performance</CardTitle>
                <CardDescription>
                  Track your solar panel efficiency and discover optimization opportunities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Cost Optimization</CardTitle>
                <CardDescription>
                  Get personalized recommendations to reduce your electricity costs
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Pricing Comparison */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-muted">
              <CardHeader className="text-center">
                <CardTitle>Guest Mode</CardTitle>
                <CardDescription>Perfect for trying out the platform</CardDescription>
                <div className="text-3xl font-bold mt-2">Free</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Analyze up to 3 electricity bills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Basic AI insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Solar performance analysis</span>
                  </div>
                </div>
                <Button onClick={handleTryAsGuest} className="w-full">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle>Full Access</CardTitle>
                <CardDescription>For serious energy optimization</CardDescription>
                <div className="text-3xl font-bold mt-2">Free</div>
                <div className="text-sm text-muted-foreground">During Beta</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Unlimited bill analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Advanced AI insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Historical data tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Export reports (PDF)</span>
                  </div>
                </div>
                <Button onClick={handleSignUp} className="w-full">
                  Sign Up Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestLanding;

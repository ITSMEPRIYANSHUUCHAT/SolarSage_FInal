
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Crown, AlertTriangle } from 'lucide-react';

const GuestModeNotice: React.FC = () => {
  const { guestPdfCount, exitGuestMode } = useAuth();
  const navigate = useNavigate();
  const remainingUploads = 3 - guestPdfCount;
  const progressValue = (guestPdfCount / 3) * 100;

  const handleSignUp = () => {
    exitGuestMode();
    navigate('/auth');
  };

  if (guestPdfCount >= 3) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="space-y-3">
          <div>
            <p className="font-medium text-orange-800">Guest limit reached!</p>
            <p className="text-sm text-orange-700">
              You've analyzed 3 bills as a guest. Sign up to get unlimited access to advanced AI insights.
            </p>
          </div>
          <Button onClick={handleSignUp} size="sm" className="bg-orange-600 hover:bg-orange-700">
            <Crown className="mr-2 h-4 w-4" />
            Sign Up for Unlimited Access
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Clock className="h-4 w-4 text-blue-600" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium text-blue-800">Guest Mode</p>
          <p className="text-sm text-blue-700">
            You have {remainingUploads} free analysis{remainingUploads !== 1 ? 'es' : ''} remaining.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-blue-600">
            <span>{guestPdfCount}/3 used</span>
            <span>{remainingUploads} remaining</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
        <Button onClick={handleSignUp} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
          <Crown className="mr-2 h-4 w-4" />
          Sign Up for Unlimited
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default GuestModeNotice;

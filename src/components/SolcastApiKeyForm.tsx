
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSolcastApiKey, setSolcastApiKey } from '@/utils/solcastApi';
import { toast } from 'sonner';

interface SolcastApiKeyFormProps {
  onApiKeySet: () => void;
}

const SolcastApiKeyForm: React.FC<SolcastApiKeyFormProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [hasExistingKey, setHasExistingKey] = useState<boolean>(false);

  useEffect(() => {
    // Check if we already have a stored API key
    const storedKey = getSolcastApiKey();
    if (storedKey) {
      setHasExistingKey(true);
      setApiKey(storedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    setSolcastApiKey(apiKey.trim());
    toast.success('Solcast API key has been saved');
    onApiKeySet();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solcast API Configuration</CardTitle>
        <CardDescription>
          To analyze solar efficiency, we need your Solcast API key.
          {hasExistingKey ? " You already have an API key stored." : ""}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="text-sm font-medium leading-6 text-gray-900">
                API Key
              </label>
              <div className="mt-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Solcast API key"
                  className="w-full"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Your API key is stored locally and is only used to make requests to the Solcast API.</p>
              <p>You can get an API key from <a href="https://toolkit.solcast.com.au/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Solcast</a>.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onApiKeySet}>
            Skip
          </Button>
          <Button type="submit">
            {hasExistingKey ? 'Update API Key' : 'Save API Key'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SolcastApiKeyForm;

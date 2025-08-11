
import { toast } from "sonner";

interface SolcastLocation {
  latitude: number;
  longitude: number;
}

export interface SolcastForecastData {
  estimatedActuals: Array<{
    period_end: string;
    period: string;
    pv_estimate: number;
  }>;
  forecasts: Array<{
    period_end: string;
    period: string;
    pv_estimate: number;
  }>;
}

// Since we don't have a backend for API key storage, this will be a temporary solution
// In a real application, this should be handled by a backend service
let solcastApiKey: string | null = null;

export const setSolcastApiKey = (apiKey: string) => {
  solcastApiKey = apiKey;
  localStorage.setItem('solcast_api_key', apiKey);
};

export const getSolcastApiKey = (): string | null => {
  if (!solcastApiKey) {
    solcastApiKey = localStorage.getItem('solcast_api_key');
  }
  return solcastApiKey;
};

export const fetchSolarForecast = async (
  location: SolcastLocation,
  startDate: string,
  endDate: string
): Promise<SolcastForecastData | null> => {
  const apiKey = getSolcastApiKey();
  
  if (!apiKey) {
    toast.error("Solcast API key not found. Please set your API key.");
    return null;
  }

  try {
    // Format dates as required by Solcast API (ISO format)
    const formattedStartDate = new Date(startDate).toISOString();
    const formattedEndDate = new Date(endDate).toISOString();

    // Get estimated actuals (historical data)
    const actualsResponse = await fetch(
      `https://api.solcast.com.au/pv_power/estimated_actuals?latitude=${location.latitude}&longitude=${location.longitude}&capacity=5&start=${formattedStartDate}&end=${formattedEndDate}&format=json&api_key=${apiKey}`
    );

    if (!actualsResponse.ok) {
      throw new Error(`Failed to fetch actual solar data: ${actualsResponse.statusText}`);
    }

    const actualsData = await actualsResponse.json();

    // Get forecasts for comparison
    const forecastResponse = await fetch(
      `https://api.solcast.com.au/pv_power/forecasts?latitude=${location.latitude}&longitude=${location.longitude}&capacity=5&start=${formattedStartDate}&end=${formattedEndDate}&format=json&api_key=${apiKey}`
    );

    if (!forecastResponse.ok) {
      throw new Error(`Failed to fetch forecast solar data: ${forecastResponse.statusText}`);
    }

    const forecastData = await forecastResponse.json();

    return {
      estimatedActuals: actualsData.estimated_actuals || [],
      forecasts: forecastData.forecasts || []
    };
  } catch (error) {
    console.error("Error fetching solar data:", error);
    toast.error("Failed to fetch solar forecast data. Please try again later.");
    return null;
  }
};

export const calculateSolarEfficiency = (
  actualGeneration: number,
  forecastGeneration: number
): number => {
  if (forecastGeneration === 0) return 0;
  return (actualGeneration / forecastGeneration) * 100;
};

export const getSolarInsights = async (
  location: SolcastLocation,
  billingPeriod: string,
  actualGeneration: number
): Promise<{
  efficiency: number;
  idealGeneration: number;
  actualGeneration: number;
  potentialSavings: number;
} | null> => {
  try {
    // Parse billing period to get start and end dates
    const [startDateStr, endDateStr] = billingPeriod.split(' - ').map(d => d.trim());
    
    // Fetch solar forecast data for the billing period
    const solarData = await fetchSolarForecast(location, startDateStr, endDateStr);
    
    if (!solarData) return null;
    
    // Calculate total forecasted generation for the period
    const totalForecast = solarData.forecasts.reduce(
      (sum, entry) => sum + entry.pv_estimate,
      0
    );
    
    // Calculate efficiency percentage
    const efficiency = calculateSolarEfficiency(actualGeneration, totalForecast);
    
    // Calculate potential savings (kWh that could have been generated if at 100% efficiency)
    const potentialSavings = totalForecast - actualGeneration;
    
    return {
      efficiency,
      idealGeneration: totalForecast,
      actualGeneration,
      potentialSavings
    };
  } catch (error) {
    console.error("Error calculating solar insights:", error);
    toast.error("Failed to calculate solar efficiency.");
    return null;
  }
};

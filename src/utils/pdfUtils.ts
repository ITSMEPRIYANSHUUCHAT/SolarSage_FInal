
import { toast } from "sonner";

export interface BillData {
  accountNumber: string;
  billingPeriod: string;
  totalAmount: number;
  dueDate: string;
  energyUsage: number;
  previousUsage: number;
  averageDailyUsage: number;
  location: {
    latitude: number;
    longitude: number;
  };
  solarGeneration: number;
  rates: {
    [key: string]: number;
  };
  charges: {
    [key: string]: number;
  };
}

// Legacy function - now handled by Supabase edge functions
export const processPDF = async (file: File): Promise<BillData> => {
  toast.info('Please use the new upload flow above');
  throw new Error('Use Supabase integration instead');
};


import { BillData } from '@/utils/pdfUtils';

interface AIExtractedData {
  name?: string;
  address?: string;
  billingMode?: string;
  tariffCategory?: string;
  sanctionedLoad?: number;
  consumption?: number;
  generation?: number;
  export?: number;
  billingPeriod?: string;
  totalAmount?: number;
  dueDate?: string;
  accountNumber?: string;
}

// Simulate AI extraction from PDF text
export const extractDataWithAI = async (pdfText: string): Promise<Partial<BillData>> => {
  // In a real implementation, this would call OpenAI API or LangChain
  // For demo purposes, we'll simulate intelligent extraction with enhanced mock data
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate AI processing time
      const extractedData: Partial<BillData> = {
        accountNumber: generateAccountNumber(),
        billingPeriod: generateBillingPeriod(),
        totalAmount: generateRandomAmount(100, 300),
        dueDate: generateDueDate(),
        energyUsage: generateRandomUsage(600, 1200),
        previousUsage: generateRandomUsage(500, 1100),
        averageDailyUsage: generateRandomUsage(20, 40),
        location: {
          latitude: 34.0522 + (Math.random() - 0.5) * 2, // Vary around LA
          longitude: -118.2437 + (Math.random() - 0.5) * 2
        },
        solarGeneration: generateRandomUsage(250, 450),
        rates: {
          "Tier 1 (0-500 kWh)": 0.15 + Math.random() * 0.05,
          "Tier 2 (501+ kWh)": 0.18 + Math.random() * 0.05,
          "Peak Hours": 0.25 + Math.random() * 0.05
        },
        charges: generateChargesBreakdown()
      };
      
      resolve(extractedData);
    }, 2000); // Simulate AI processing delay
  });
};

// Helper functions for generating realistic data
function generateAccountNumber(): string {
  return Math.floor(Math.random() * 900000000 + 100000000).toString();
}

function generateBillingPeriod(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const year = new Date().getFullYear();
  
  return `${months[prevMonth]} 15, ${year} - ${months[currentMonth]} 15, ${year}`;
}

function generateDueDate(): string {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30 + 15));
  return futureDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function generateRandomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min) + Math.random();
}

function generateRandomUsage(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateChargesBreakdown(): { [key: string]: number } {
  const baseAmount = generateRandomAmount(80, 180);
  return {
    "Energy Charges": baseAmount,
    "Distribution Fee": generateRandomAmount(10, 25),
    "Grid Access Fee": generateRandomAmount(5, 15),
    "Renewable Energy Fee": generateRandomAmount(3, 8),
    "Taxes & Surcharges": generateRandomAmount(8, 20)
  };
}

// Predefined queries for LangChain (for future implementation)
export const EXTRACTION_QUERIES = [
  "What is the customer's name on this electricity bill?",
  "What is the billing address?",
  "What is the billing period?",
  "What is the total amount due?",
  "How much energy was consumed in kWh?",
  "How much solar energy was generated?",
  "What are the different rate tiers and their costs?",
  "What is the account number?",
  "When is the payment due date?"
];

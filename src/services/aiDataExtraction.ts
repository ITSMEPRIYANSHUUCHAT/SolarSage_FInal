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
  discomName?: string;
}

// List of known DISCOMs for validation
const KNOWN_DISCOMS = [
  'TORRENT POWER',
  'PGVCL (Paschim Gujarat Vij Company)',
  'UGVCL (Uttar Gujarat Vij Company)', 
  'MGVCL (Madhya Gujarat Vij Company)',
  'DGVCL (Dakshin Gujarat Vij Company)',
  'MSEDCL',
  'BESCOM',
  'KSEB',
  'TNEB'
];

// Simulate AI extraction from PDF text
export const extractDataWithAI = async (pdfText: string): Promise<Partial<BillData>> => {
  // Validate if it's an electricity bill
  const textLower = pdfText.toLowerCase();
  const hasElectricityKeywords = [
    'electricity', 'power', 'energy', 'kwh', 'units', 'bill', 'discom', 'tariff'
  ].some(keyword => textLower.includes(keyword));
  
  if (!hasElectricityKeywords) {
    throw new Error('This does not appear to be an electricity bill. Please upload a valid electricity bill PDF from a recognized DISCOM.');
  }
  
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
          latitude: 23.0225 + (Math.random() - 0.5) * 2, // Vary around Gujarat
          longitude: 72.5714 + (Math.random() - 0.5) * 2
        },
        solarGeneration: generateRandomUsage(250, 450),
        rates: {
          "Tier 1 (0-500 kWh)": 3.5 + Math.random() * 1.5, // Rupees per kWh
          "Tier 2 (501+ kWh)": 4.2 + Math.random() * 1.5,
          "Peak Hours": 6.0 + Math.random() * 2.0
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
  const baseAmount = generateRandomAmount(1200, 2800); // In rupees
  return {
    "Energy Charges": baseAmount,
    "Fixed Charges": generateRandomAmount(150, 350),
    "Electricity Duty": generateRandomAmount(75, 180),
    "Fuel Adjustment": generateRandomAmount(45, 120),
    "Regulatory Charges": generateRandomAmount(25, 85),
    "Other Charges": generateRandomAmount(30, 95)
  };
}

// Predefined queries for LangChain (for future implementation)
export const EXTRACTION_QUERIES = [
  "What is the DISCOM name on this electricity bill?",
  "What is the customer's name on this electricity bill?",
  "What is the billing address?",
  "What is the billing period?",
  "What is the total amount due in rupees?",
  "How much energy was consumed in kWh?",
  "How much solar energy was generated?",
  "What are the different rate tiers and their costs in rupees per kWh?",
  "What is the account number or consumer number?",
  "When is the payment due date?"
];

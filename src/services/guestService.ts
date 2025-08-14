
import { BillData } from '@/utils/pdfUtils';
import { InsightsData } from '@/utils/insightsGenerator';

export interface GuestPDFProcessingResult {
  billData: BillData;
  insights: InsightsData;
  isLimitReached: boolean;
}

export const uploadPDFAsGuest = async (file: File): Promise<{ extractedText: string; fileName: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Uploading PDF file as guest:', file.name);

  // For demo purposes, we'll simulate the upload
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    extractedText: 'Demo extracted text for guest mode',
    fileName: file.name
  };
};

export const processPDFWithAIAsGuest = async (
  pdfText: string, 
  fileName: string,
  guestPdfCount: number
): Promise<GuestPDFProcessingResult> => {
  console.log('Processing PDF with AI as guest, text length:', pdfText.length);

  if (guestPdfCount >= 3) {
    throw new Error('Guest limit reached. Please sign up to analyze more bills.');
  }

  // Use a simplified processing approach for guests
  const mockBillData: BillData = {
    accountNumber: 'GUEST-' + Date.now(),
    billingPeriod: 'Current Month',
    totalAmount: 1250,
    dueDate: 'Sample Date',
    energyUsage: 450,
    previousUsage: 380,
    averageDailyUsage: 15,
    solarGeneration: 320,
    location: { latitude: 23.0225, longitude: 72.5714 },
    rates: {
      'Tier 1 (0-500 kWh)': 4.5,
      'Tier 2 (501+ kWh)': 6.2
    },
    charges: {
      'Energy Charges': 950,
      'Fixed Charges': 150,
      'Taxes': 150
    }
  };

  const mockInsights: InsightsData = {
    summary: {
      totalAmount: 1250,
      dueDate: 'Sample Date',
      billingPeriod: 'Current Month'
    },
    usage: {
      current: 450,
      previous: 380,
      change: 18.4,
      averageDaily: 15
    },
    costs: {
      breakdown: {
        'Energy Charges': 950,
        'Fixed Charges': 150,
        'Taxes': 150
      },
      largestExpense: 'Energy Charges'
    },
    solar: {
      efficiency: 85.2,
      idealGeneration: 375,
      actualGeneration: 320,
      potentialSavings: 55
    },
    insights: [
      {
        title: "Guest Mode Demo",
        description: `This is a demo analysis showing how your bill would be analyzed. Sign up to get real AI-powered insights from your electricity bills.`,
        type: "info"
      },
      {
        title: "Solar Performance",
        description: "Your solar system is performing at 85.2% efficiency compared to ideal conditions.",
        type: "info"
      },
      {
        title: "Usage Increase",
        description: "Your energy usage increased by 18.4% compared to last month.",
        type: "warning"
      }
    ]
  };

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    billData: mockBillData,
    insights: mockInsights,
    isLimitReached: guestPdfCount + 1 >= 3
  };
};

export const getGuestPdfCount = (): number => {
  return parseInt(localStorage.getItem('guest_pdf_count') || '0');
};

export const setGuestPdfCount = (count: number): void => {
  localStorage.setItem('guest_pdf_count', count.toString());
};

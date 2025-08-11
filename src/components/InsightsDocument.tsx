
import React, { useRef, useEffect } from 'react';
import { InsightsData } from '@/utils/insightsGenerator';
import { generatePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { getSolcastApiKey } from '@/utils/solcastApi';
import { BillData } from '@/utils/pdfUtils';
import { createCustomerInfo, convertToCustomerInfo } from '@/services/customerService';

interface InsightsDocumentProps {
  insights: InsightsData;
  fileName: string;
  onComplete: () => void;
  billData: BillData;
}

const InsightsDocument: React.FC<InsightsDocumentProps> = ({ 
  insights, 
  fileName, 
  onComplete,
  billData
}) => {
  const generateAndDownloadPDF = async () => {
    try {
      // Prepare data for PDF generation
      const reportData = {
        name: 'Solar Customer', // In real app, extract from bill
        address: `Lat: ${billData.location.latitude}, Lng: ${billData.location.longitude}`,
        month: billData.billingPeriod.split(' - ')[0],
        consumption: billData.energyUsage.toString(),
        generation: billData.solarGeneration.toString(),
        savings: (billData.solarGeneration * (billData.rates["Tier 1 (0-500 kWh)"] || 0.15)).toFixed(2),
        neighRank: 'Top 25%', // Mock data
        topGen: insights.solar ? (insights.solar.efficiency > 80 ? 'Excellent' : 'Good') : 'N/A',
        missedSavings: insights.solar?.potentialSavings?.toString() || '0',
        billingMode: 'Net Metering',
        latitude: billData.location.latitude,
        longitude: billData.location.longitude
      };
      
      // Generate PDF using jsPDF
      generatePDF(reportData);
      
      // Save data to database
      try {
        const customerData = convertToCustomerInfo(billData, insights);
        await createCustomerInfo(customerData);
        toast.success('Report generated and data saved successfully!');
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        toast.error('PDF generated but failed to save data to database');
      }
      
      onComplete();
    } catch (error) {
      console.error('Error generating PDF report:', error);
      toast.error('Failed to generate PDF report');
      onComplete();
    }
  };
  
  // Start the download process after component mounts
  useEffect(() => {
    generateAndDownloadPDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return null; // No UI needed, just processing
};

export default InsightsDocument;

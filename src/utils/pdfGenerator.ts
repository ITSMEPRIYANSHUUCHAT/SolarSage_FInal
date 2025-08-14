
import { jsPDF } from 'jspdf';

interface ReportData {
  name?: string;
  address?: string;
  month?: string;
  consumption?: string;
  generation?: string;
  savings?: string;
  neighRank?: string;
  topGen?: string;
  missedSavings?: string;
  billingMode?: string;
  latitude?: number;
  longitude?: number;
  accountNumber?: string;
  dueDate?: string;
  totalAmount?: number;
  sanctionedLoad?: string;
  tariffCategory?: string;
}

export function generatePDF(data: ReportData) {
  const {
    name = 'Unknown Customer',
    address = 'Unknown Address',
    month = 'Unknown',
    consumption = 'Unknown',
    generation = 'Unknown',
    savings = 'Unknown',
    neighRank = 'Unknown',
    topGen = 'Unknown',
    missedSavings = 'Unknown',
    accountNumber = 'Unknown',
    dueDate = 'Unknown',
    totalAmount = 0,
    sanctionedLoad = 'Unknown',
    tariffCategory = 'Unknown'
  } = data;

  const doc = new jsPDF();

  const primaryColor = '#1a5f7a';
  const secondaryColor = '#159895';
  const accentColor = '#57c5b6';

  const addPage = () => {
    doc.addPage();
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Personalized Solar Performance Report', 20, 20);
    doc.setDrawColor(200);
    doc.line(20, 22, 190, 22);
    doc.setTextColor(0);
    doc.setFontSize(12);
  };

  // Cover Page with Company Branding
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('SolarSage Energy Solutions', 20, 20);
  doc.text('Near Navrangpura, Ahmedabad, Gujarat 380009', 20, 30);
  doc.text('Phone: +91 79 2656 7890 | Email: info@solarsage.in', 20, 40);

  doc.setDrawColor(primaryColor);
  doc.line(20, 45, 190, 45);

  doc.setFontSize(28);
  doc.setTextColor(primaryColor);
  doc.text('Personalized Solar', 20, 70);
  doc.text('Performance Report', 20, 85);

  doc.setFontSize(16);
  doc.setTextColor(secondaryColor);
  doc.text('Your Path to Sustainable Energy', 20, 105);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Prepared for: ${name}`, 20, 130);
  doc.text(`Account Number: ${accountNumber}`, 20, 145);
  doc.text(`Report Period: ${month}`, 20, 160);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 175);

  // Summary Box
  doc.setDrawColor(accentColor);
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 190, 170, 40, 'FD');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Quick Summary:', 25, 205);
  doc.text(`Total Bill Amount: INR${totalAmount}`, 25, 215);
  doc.text(`Energy Consumed: ${consumption} kWh`, 25, 225);

  // Page 1 - Client Information & Bill Details
  addPage();
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text('Client Information & Bill Details', 20, 40);

  // Client Info Table
  doc.setFontSize(11);
  doc.setTextColor(0);
  
  const clientData = [
    ['Customer Name', name],
    ['Service Address', address],
    ['Account Number', accountNumber],
    ['Billing Month', month],
    ['Due Date', dueDate],
    ['Tariff Category', tariffCategory],
    ['Sanctioned Load', sanctionedLoad],
    ['Total Bill Amount', `INR${totalAmount}`]
  ];

  let yPos = 60;
  clientData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 90, yPos);
    yPos += 10;
  });

  // Energy Performance Section
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text('Energy Performance Analysis', 20, yPos + 20);

  yPos += 40;
  const energyData = [
    ['Total Energy Consumed', `${consumption} kWh`],
    ['Solar Energy Generated', `${generation} kWh`],
    ['Energy Savings', `INR${savings}`],
    ['Missed Savings Potential', `INR${missedSavings}`]
  ];

  doc.setFontSize(11);
  energyData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 90, yPos);
    yPos += 10;
  });

  // Page 2 - Neighborhood Comparison & Analysis
  addPage();
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text('Performance Analysis & Recommendations', 20, 40);

  doc.setFontSize(14);
  doc.setTextColor(secondaryColor);
  doc.text('Neighborhood Comparison', 20, 60);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Your solar system ranks ${neighRank} in your area.`, 20, 75);
  doc.text(`Performance rating: ${topGen}`, 20, 85);

  // Recommendations Section
  doc.setFontSize(14);
  doc.setTextColor(secondaryColor);
  doc.text('Optimization Recommendations', 20, 110);

  doc.setFontSize(11);
  doc.setTextColor(0);
  const recommendations = [
    '1. Regular Panel Cleaning: Dust accumulation can reduce efficiency by 15-25%',
    '2. Shading Analysis: Monitor and trim vegetation that may cast shadows',
    '3. Inverter Maintenance: Schedule quarterly performance checks',
    '4. Energy Usage Optimization: Consider shifting high-consumption appliances to peak solar hours',
    '5. System Upgrade: Evaluate benefits of additional panels or battery storage'
  ];

  yPos = 125;
  recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec, 160);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 6 + 5;
  });

  // Page 3 - Financial Analysis & Next Steps
  addPage();
  doc.setFontSize(20);
  doc.setTextColor(accentColor);
  doc.text('Financial Impact & Future Opportunities', 20, 40);

  doc.setFontSize(14);
  doc.setTextColor(secondaryColor);
  doc.text('Potential Savings Analysis', 20, 60);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Current monthly savings: INR${savings}`, 20, 75);
  doc.text(`Potential additional savings: INR${missedSavings}`, 20, 85);
  doc.text(`Annual savings potential: INR${(parseFloat(savings) + parseFloat(missedSavings)) * 12}`, 20, 95);

  // Next Steps Section
  doc.setFontSize(14);
  doc.setTextColor(secondaryColor);
  doc.text('Recommended Next Steps', 20, 120);

  doc.setFontSize(11);
  doc.setTextColor(0);
  const nextSteps = [
    '1. Schedule a comprehensive system audit with our technical team',
    '2. Set up monthly bill tracking for continuous monitoring',
    '3. Consider energy-efficient appliance upgrades',
    '4. Explore battery storage options for enhanced savings',
    '5. Join our customer portal for real-time system monitoring'
  ];

  yPos = 135;
  nextSteps.forEach(step => {
    const lines = doc.splitTextToSize(step, 160);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 6 + 5;
  });

  // Contact Information
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('Contact & Support', 20, yPos + 20);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('For technical support and consultations:', 20, yPos + 35);
  doc.text('Phone: +91 79 2656 7890', 20, yPos + 50);
  doc.text('Email: support@solarsage.in', 20, yPos + 60);
  doc.text('Website: www.solarsage.in', 20, yPos + 70);
  doc.text('Address: Near Navrangpura, Ahmedabad, Gujarat 380009', 20, yPos + 80);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('This report is generated based on your submitted electricity bill data and industry benchmarks.', 20, 280);
  doc.text('For the most accurate analysis, ensure regular bill uploads and system monitoring.', 20, 290);

  doc.save(`Solar_Performance_Report_${month.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
}

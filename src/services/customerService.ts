
import { connectToDatabase } from '../utils/dbConnect';
import { CustomerInfo, ICustomerInfo } from '../models/CustomerInfo';
import { BillData } from '../utils/pdfUtils';
import { InsightsData } from '../utils/insightsGenerator';

/**
 * Create a new customer info record
 */
export const createCustomerInfo = async (data: Partial<ICustomerInfo>): Promise<ICustomerInfo> => {
  await connectToDatabase();
  const customerInfo = new CustomerInfo(data);
  await customerInfo.save();
  return customerInfo.toObject() as ICustomerInfo;
};

/**
 * Get all customer info records
 */
export const getAllCustomerInfo = async (): Promise<ICustomerInfo[]> => {
  await connectToDatabase();
  const records = await CustomerInfo.find({}).sort({ createdAt: -1 }).lean().exec();
  return records as unknown as ICustomerInfo[];
};

/**
 * Get a customer info record by ID
 */
export const getCustomerInfoById = async (id: string): Promise<ICustomerInfo | null> => {
  await connectToDatabase();
  const record = await CustomerInfo.findById(id).lean().exec();
  return record as unknown as ICustomerInfo | null;
};

/**
 * Delete a customer info record by ID
 */
export const deleteCustomerInfoById = async (id: string): Promise<boolean> => {
  await connectToDatabase();
  const result = await CustomerInfo.findByIdAndDelete(id).exec();
  return !!result;
};

/**
 * Convert bill and insights data to customer info data
 */
export const convertToCustomerInfo = (billData: BillData, insightsData: InsightsData): Partial<ICustomerInfo> => {
  return {
    billing_date: billData.billingPeriod,
    month: new Date(billData.billingPeriod.split('-')[0].trim()).toLocaleString('default', { month: 'long' }),
    consumption: billData.energyUsage.toString(),
    generation: billData.solarGeneration?.toString() || '0',
    latitude: billData.location.latitude,
    longitude: billData.location.longitude,
    savings: ((billData.solarGeneration || 0) * (billData.rates["Tier 1 (0-500 kWh)"] || 0)).toFixed(2),
    missedSavings: insightsData.solar?.potentialSavings || 0,
    // Other fields would need to be filled from actual data sources
    // For demo purposes, we're using placeholders
    name: 'Sample Customer',
    address: '123 Main St',
    neighRank: 'Top 20%',
    topGen: insightsData.solar?.efficiency > 80 ? 'Yes' : 'No',
    billing_mode: 'Standard',
    total_dni: insightsData.solar?.idealGeneration || 0,
    D_value: 0,
    E_value: 0,
    F_value: 0,
    G_value: 0
  };
};

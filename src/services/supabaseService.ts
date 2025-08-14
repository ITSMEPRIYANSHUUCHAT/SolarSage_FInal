
import { supabase } from '@/integrations/supabase/client';
import { BillData } from '@/utils/pdfUtils';
import { InsightsData } from '@/utils/insightsGenerator';

export interface CustomerRecord {
  id: string;
  name: string;
  address: string;
  month: string;
  consumption: string;
  generation: string;
  savings: string;
  neigh_rank: string;
  top_gen: string;
  missed_savings: number;
  latitude: number;
  longitude: number;
  billing_date: string;
  billing_mode: string;
  total_dni: number;
  d_value: number;
  e_value: number;
  f_value: number;
  g_value: number;
  created_at: string;
  updated_at: string;
}

export const uploadPDF = async (file: File): Promise<{ extractedText: string; fileName: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Uploading PDF file:', file.name);

  const { data, error } = await supabase.functions.invoke('upload-pdf', {
    body: formData,
  });

  if (error) {
    console.error('Upload PDF error:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to process PDF');
  }
  
  return {
    extractedText: data.extractedText,
    fileName: data.fileName
  };
};

export const processPDFWithAI = async (pdfText: string, fileName: string): Promise<{
  billData: BillData;
  insights: InsightsData;
  dbRecord: any;
}> => {
  console.log('Processing PDF with AI, text length:', pdfText.length);

  // Get the current session to send auth headers
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  const { data, error } = await supabase.functions.invoke('process-pdf', {
    body: { pdfText, fileName },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('Process PDF error:', error);
    throw new Error(`Failed to process PDF with AI: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to analyze PDF with AI');
  }
  
  return {
    billData: data.billData,
    insights: data.insights,
    dbRecord: data.dbRecord
  };
};

export const getAllCustomerRecords = async (): Promise<CustomerRecord[]> => {
  const { data, error } = await supabase
    .from('customer_info')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteCustomerRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('customer_info')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

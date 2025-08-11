
-- Create customer_info table to store extracted bill data
CREATE TABLE public.customer_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  address TEXT,
  month TEXT,
  consumption TEXT,
  generation TEXT,
  savings TEXT,
  neigh_rank TEXT,
  top_gen TEXT,
  missed_savings NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  billing_date TEXT,
  billing_mode TEXT,
  total_dni NUMERIC,
  d_value NUMERIC DEFAULT 0,
  e_value NUMERIC DEFAULT 0,
  f_value NUMERIC DEFAULT 0,
  g_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE public.customer_info ENABLE ROW LEVEL SECURITY;

-- Allow public read access for this demo app (no authentication required)
CREATE POLICY "Allow public read access" ON public.customer_info
  FOR SELECT USING (true);

-- Allow public insert access for this demo app
CREATE POLICY "Allow public insert access" ON public.customer_info
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true);

-- Allow public access to PDF storage
CREATE POLICY "Allow public PDF uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Allow public PDF access" ON storage.objects
  FOR SELECT USING (bucket_id = 'pdfs');


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import * as pdfjsLib from "npm:pdfjs-dist@4.2.67";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function extractTextFromPDF(fileBuffer: Uint8Array): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('Processing file:', file.name, 'Size:', file.size);

    // Convert file to buffer for text extraction
    const fileBuffer = new Uint8Array(await file.arrayBuffer());

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileBuffer);
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('Could not extract sufficient text from the PDF. Please ensure it contains readable text.');
    }

    console.log('Successfully extracted text, length:', extractedText.length);

    // Connect to Supabase to store the file
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upload file to storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extractedText,
      fileName: file.name,
      storagePath: uploadData?.path
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Error in upload-pdf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

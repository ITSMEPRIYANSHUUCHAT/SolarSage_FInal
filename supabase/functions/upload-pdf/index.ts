
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import * as pdfjsLib from "npm:pdfjs-dist@4.2.67";
import { buildCorsHeaders, HttpError, requireEnv, jsonResponse, errorStatus } from "../_shared/http.ts";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
    throw new HttpError(422, 'Failed to extract text from PDF');
  }
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // SEC-02: require an authenticated user (was fully open before).
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new HttpError(401, 'Authentication required');

    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) throw new HttpError(401, 'Invalid authentication token');

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) throw new HttpError(400, 'No file provided');

    // FIX-04: enforce PDF type and a size cap (DoS / abuse guard).
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new HttpError(400, 'Only PDF files are accepted');
    if (file.size > MAX_BYTES) throw new HttpError(413, 'File too large (max 10 MB)');

    console.log('Processing file for user:', user.id, 'name:', file.name, 'size:', file.size);

    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const extractedText = await extractTextFromPDF(fileBuffer);

    if (!extractedText || extractedText.length < 50) {
      throw new HttpError(
        422,
        'Could not extract sufficient text from the PDF. Please ensure it contains readable text.',
      );
    }

    console.log('Successfully extracted text, length:', extractedText.length);

    // SEC-01: store under a per-user path in the (now private) bucket.
    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const storageKey = `${user.id}/${Date.now()}_${safeName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(storageKey, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) {
      // FAIL-07: surface (don't silently swallow) but don't fail the whole request —
      // text extraction succeeded and is what the next step needs.
      console.error('Storage upload error:', uploadError);
    }

    return jsonResponse({
      success: true,
      extractedText,
      fileName: file.name,
      storagePath: uploadData?.path ?? null,
      stored: !uploadError,
    }, 200, cors);

  } catch (error) {
    const { status, message } = errorStatus(error);
    if (status >= 500) console.error('Error in upload-pdf function:', error);
    return jsonResponse({ error: message, success: false }, status, cors);
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of known DISCOMs (Distribution Companies) in India
const KNOWN_DISCOMS = [
  'TORRENT', 'TORRENT POWER',
  'PGVCL', 'PASCHIM GUJARAT VIJ COMPANY',
  'UGVCL', 'UTTAR GUJARAT VIJ COMPANY',
  'MGVCL', 'MADHYA GUJARAT VIJ COMPANY',
  'DGVCL', 'DAKSHIN GUJARAT VIJ COMPANY',
  'MSEDCL', 'MAHARASHTRA STATE ELECTRICITY',
  'TSNPDCL', 'TELANGANA STATE ELECTRICITY',
  'APSPDCL', 'ANDHRA PRADESH ELECTRICITY',
  'BESCOM', 'BANGALORE ELECTRICITY',
  'KSEB', 'KERALA STATE ELECTRICITY',
  'TNEB', 'TAMIL NADU ELECTRICITY',
  'PSPCL', 'PUNJAB STATE POWER',
  'BSES', 'BOMBAY SUBURBAN ELECTRIC',
  'TATA POWER', 'RELIANCE ENERGY',
  'ADANI ELECTRICITY', 'CESC',
  'BYPL', 'BSES YAMUNA POWER',
  'BRPL', 'BSES RAJDHANI POWER',
  'NDPL', 'NORTH DELHI POWER',
  'UHBVN', 'UTTAR HARYANA BIJLI',
  'DHBVN', 'DAKSHIN HARYANA BIJLI',
  'UPCL', 'UTTARAKHAND POWER',
  'JVVNL', 'JAIPUR VIDYUT VITRAN',
  'AVVNL', 'AJMER VIDYUT VITRAN',
  'JDVVNL', 'JODHPUR VIDYUT VITRAN'
];

// Electricity bill keywords to validate content
const ELECTRICITY_BILL_KEYWORDS = [
  'electricity bill', 'electric bill', 'power bill', 'energy bill',
  'units consumed', 'kwh', 'kw', 'electricity charges',
  'meter reading', 'billing period', 'due date',
  'tariff', 'rate schedule', 'demand charges',
  'energy charges', 'fuel adjustment', 'regulatory charges',
  'electricity duty', 'consumer number', 'service connection',
  'load sanctioned', 'contract demand', 'maximum demand',
  'previous reading', 'present reading', 'consumption',
  'bill amount', 'arrears', 'rebate', 'surcharge'
];

const validateElectricityBill = (pdfText: string): { isValid: boolean; reason?: string } => {
  const textLower = pdfText.toLowerCase();
  
  const foundDiscom = KNOWN_DISCOMS.find(discom => 
    textLower.includes(discom.toLowerCase())
  );
  
  const foundKeywords = ELECTRICITY_BILL_KEYWORDS.filter(keyword =>
    textLower.includes(keyword.toLowerCase())
  );
  
  if (foundDiscom || foundKeywords.length >= 3) {
    return { isValid: true };
  }
  
  const hasUnitPattern = /\d+\s*(units?|kwh|kw)/i.test(pdfText);
  const hasBillPattern = /(bill|invoice|statement)/i.test(pdfText);
  const hasAmountPattern = /(\₹|rs\.?|rupees?)\s*\d+/i.test(pdfText);
  
  if (hasUnitPattern && hasBillPattern && hasAmountPattern) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    reason: `This doesn't appear to be an electricity bill. Expected to find a DISCOM name (like ${KNOWN_DISCOMS.slice(0, 5).join(', ')}, etc.) or electricity bill keywords, but found none. Please upload a valid electricity bill PDF.`
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, fileName } = await req.json();
    
    console.log('Processing PDF:', fileName);
    console.log('PDF Text length:', pdfText?.length || 0);

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No valid PDF content to process');
    }

    const validation = validateElectricityBill(pdfText);
    if (!validation.isValid) {
      throw new Error(validation.reason || 'Invalid electricity bill format');
    }

    console.log('PDF validated as electricity bill');

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Initialize Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log('Processing for user:', user.id);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in the project settings.');
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting data from Indian electricity bills from DISCOMs like TORRENT, PGVCL, UGVCL, MGVCL, DGVCL, MSEDCL, BESCOM, etc. Extract the following information from the bill text and return it as valid JSON (no markdown formatting): customerName, address, accountNumber (or consumer number), billingPeriod, totalAmount (in rupees), dueDate, energyUsage (in kWh), previousUsage, averageDailyUsage, solarGeneration (if any, otherwise 0), location (with latitude and longitude if determinable from address), rates (as object with different tier rates in rupees), charges (as object with breakdown of different charges in rupees), discomName (name of the electricity distribution company). Extract actual numerical values. If solar generation is not mentioned, set it to 0. Return "Unknown" for any field that cannot be determined from the bill text. For location, if you can determine the general location from the address, provide reasonable coordinates for that area in India. Return ONLY valid JSON, no other text or formatting.'
          },
          {
            role: 'user',
            content: `Extract data from this Indian electricity bill text: ${pdfText}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    let extractedData;

    try {
      let aiContent = aiData.choices[0].message.content;
      console.log('AI Response:', aiContent);
      
      aiContent = aiContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      
      extractedData = JSON.parse(aiContent);
      
      if (!extractedData.totalAmount || extractedData.totalAmount === "Unknown") {
        throw new Error('Could not extract essential billing data from the PDF');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to extract valid data from the electricity bill. Please ensure the PDF contains a valid electricity bill from a recognized DISCOM.');
    }

    let totalAmount = extractedData.totalAmount;
    if (typeof totalAmount === 'string') {
      totalAmount = parseFloat(totalAmount.replace(/[^\d.-]/g, '')) || 0;
    }

    let energyUsage = extractedData.energyUsage;
    if (typeof energyUsage === 'string' && energyUsage !== "Unknown") {
      energyUsage = parseFloat(energyUsage.replace(/[^\d.-]/g, '')) || 0;
    } else if (energyUsage === "Unknown") {
      energyUsage = 0;
    }

    let solarInsights = null;
    
    if (extractedData.solarGeneration && extractedData.solarGeneration > 0) {
      const idealGeneration = extractedData.solarGeneration * 1.2;
      solarInsights = {
        efficiency: (extractedData.solarGeneration / idealGeneration) * 100,
        idealGeneration,
        actualGeneration: extractedData.solarGeneration,
        potentialSavings: idealGeneration - extractedData.solarGeneration
      };
    }

    // Store in database with the authenticated user's ID
    const customerData = {
      user_id: user.id, // Associate with authenticated user
      name: extractedData.customerName || 'Unknown Customer',
      address: extractedData.address || 'Unknown Address',
      month: extractedData.billingPeriod || 'Unknown',
      consumption: energyUsage?.toString() || '0',
      generation: extractedData.solarGeneration?.toString() || '0',
      savings: extractedData.solarGeneration ? ((extractedData.solarGeneration) * 0.15).toFixed(2) : '0',
      neigh_rank: solarInsights && solarInsights.efficiency > 80 ? 'Top 25%' : 'Average',
      top_gen: solarInsights ? (solarInsights.efficiency > 80 ? 'Excellent' : 'Good') : 'N/A',
      missed_savings: solarInsights?.potentialSavings || 0,
      latitude: extractedData.location?.latitude || 0,
      longitude: extractedData.location?.longitude || 0,
      billing_date: extractedData.billingPeriod || 'Unknown',
      billing_mode: extractedData.solarGeneration > 0 ? 'Net Metering' : 'Standard',
      total_dni: solarInsights?.idealGeneration || 0
    };

    const { data: dbResult, error: dbError } = await supabase
      .from('customer_info')
      .insert(customerData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save customer data');
    }

    const insights = {
      summary: {
        totalAmount: totalAmount,
        dueDate: extractedData.dueDate,
        billingPeriod: extractedData.billingPeriod,
        discomName: extractedData.discomName || 'Unknown DISCOM'
      },
      usage: {
        current: energyUsage,
        previous: extractedData.previousUsage || energyUsage,
        change: extractedData.previousUsage ? 
          ((energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 : 0,
        averageDaily: extractedData.averageDailyUsage || Math.round(energyUsage / 30)
      },
      costs: {
        breakdown: extractedData.charges || {},
        largestExpense: Object.keys(extractedData.charges || {}).reduce((a, b) => 
          (extractedData.charges || {})[a] > (extractedData.charges || {})[b] ? a : b, 
          Object.keys(extractedData.charges || {})[0] || 'Energy Charges'
        )
      },
      solar: solarInsights,
      insights: [
        ...(solarInsights ? [{
          title: "Solar Performance",
          description: `Your solar panels are operating at ${solarInsights.efficiency.toFixed(1)}% efficiency.`,
          type: solarInsights.efficiency < 70 ? "warning" : "info"
        }] : []),
        {
          title: "Energy Usage",
          description: `Your energy consumption this month was ${energyUsage} kWh.`,
          type: "info"
        },
        ...(extractedData.previousUsage ? [{
          title: "Usage Comparison",
          description: `Your usage ${((energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 > 0 ? 'increased' : 'decreased'} by ${Math.abs(((energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100).toFixed(1)}% compared to last month.`,
          type: ((energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 > 10 ? "warning" : "info"
        }] : []),
        {
          title: "DISCOM",
          description: `Your electricity is supplied by ${extractedData.discomName || 'Unknown DISCOM'}.`,
          type: "info"
        }
      ]
    };

    console.log('Successfully processed PDF and generated insights for user:', user.id);

    return new Response(JSON.stringify({
      success: true,
      billData: extractedData,
      insights,
      dbRecord: dbResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-pdf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

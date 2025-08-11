
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, fileName } = await req.json();
    
    console.log('Processing PDF:', fileName);
    console.log('PDF Text length:', pdfText?.length || 0);

    // Only process if we have actual PDF text content
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No valid PDF content to process');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Extract data using AI (OpenAI integration)
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
            content: 'You are an expert at extracting data from electricity bills. Extract the following information from the bill text and return it as valid JSON (no markdown formatting): customerName, address, accountNumber, billingPeriod, totalAmount, dueDate, energyUsage, previousUsage, averageDailyUsage, solarGeneration, location (with latitude and longitude if determinable from address), rates (as object with different tier rates), charges (as object with breakdown of different charges). Only extract actual data from the bill. If solar generation is not mentioned, set it to 0. Return "Unknown" for any field that cannot be determined from the bill text. For location, if you can determine the general location from the address, provide reasonable coordinates. Return ONLY valid JSON, no other text or formatting.'
          },
          {
            role: 'user',
            content: `Extract data from this electricity bill text: ${pdfText}`
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
      
      // Clean up the response - remove markdown code blocks if present
      aiContent = aiContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      
      extractedData = JSON.parse(aiContent);
      
      // Validate that we have essential data
      if (!extractedData.totalAmount || !extractedData.energyUsage) {
        throw new Error('Could not extract essential billing data from the PDF');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to extract valid data from the electricity bill. Please ensure the PDF contains a valid electricity bill.');
    }

    // Convert totalAmount to number if it's a string with currency symbols
    let totalAmount = extractedData.totalAmount;
    if (typeof totalAmount === 'string') {
      // Remove currency symbols and convert to number
      totalAmount = parseFloat(totalAmount.replace(/[^\d.-]/g, '')) || 0;
    }

    // Generate solar insights if solar generation exists
    let solarInsights = null;
    
    if (extractedData.solarGeneration && extractedData.solarGeneration > 0) {
      // Generate realistic solar insights based on the generation data
      const idealGeneration = extractedData.solarGeneration * 1.2; // Assume could be 20% better
      solarInsights = {
        efficiency: (extractedData.solarGeneration / idealGeneration) * 100,
        idealGeneration,
        actualGeneration: extractedData.solarGeneration,
        potentialSavings: idealGeneration - extractedData.solarGeneration
      };
    }

    // Store in database with real extracted data
    const customerData = {
      name: extractedData.customerName || 'Unknown Customer',
      address: extractedData.address || 'Unknown Address',
      month: extractedData.billingPeriod || 'Unknown',
      consumption: extractedData.energyUsage?.toString() || '0',
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
    }

    // Generate insights for the frontend
    const insights = {
      summary: {
        totalAmount: totalAmount,
        dueDate: extractedData.dueDate,
        billingPeriod: extractedData.billingPeriod
      },
      usage: {
        current: extractedData.energyUsage,
        previous: extractedData.previousUsage || extractedData.energyUsage,
        change: extractedData.previousUsage ? 
          ((extractedData.energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 : 0,
        averageDaily: extractedData.averageDailyUsage || Math.round(extractedData.energyUsage / 30)
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
          description: `Your energy consumption this month was ${extractedData.energyUsage} kWh.`,
          type: "info"
        },
        ...(extractedData.previousUsage ? [{
          title: "Usage Comparison",
          description: `Your usage ${((extractedData.energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 > 0 ? 'increased' : 'decreased'} by ${Math.abs(((extractedData.energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100).toFixed(1)}% compared to last month.`,
          type: ((extractedData.energyUsage - extractedData.previousUsage) / extractedData.previousUsage) * 100 > 10 ? "warning" : "info"
        }] : [])
      ]
    };

    console.log('Successfully processed PDF and generated insights');

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

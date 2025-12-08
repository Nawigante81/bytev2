// Edge Function do tworzenia rezerwacji
// Działa z service role key, więc omija RLS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingRequest {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  duration: number;
  price: number;
  device: string;
  description?: string;
}

// Funkcja do parsowania polskiej daty na format ISO
function parsePolishDate(dateStr: string): string {
  console.log('Parsing date:', dateStr);
  
  // Jeśli data jest już w formacie ISO (YYYY-MM-DD), zwróć ją bezpośrednio
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Mapa polskich nazw miesięcy na liczby
  const monthMap: { [key: string]: string } = {
    'stycznia': '01', 'styczeń': '01',
    'lutego': '02', 'luty': '02', 
    'marca': '03', 'marzec': '03',
    'kwietnia': '04', 'kwiecień': '04',
    'maja': '05', 'maj': '05',
    'czerwca': '06', 'czerwiec': '06',
    'lipca': '07', 'lipiec': '07',
    'sierpnia': '08', 'sierpień': '08',
    'września': '09', 'wrzesień': '09',
    'października': '10', 'październik': '10',
    'listopada': '11', 'listopad': '11',
    'grudnia': '12', 'grudzień': '12'
  };
  
  try {
    // Format: "czwartek, 11 grudnia 2025"
    // Lub: "11 grudnia 2025"
    const parts = dateStr.split(',').pop()?.trim() || dateStr;
    const match = parts.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    
    if (!match) {
      console.warn('Could not parse date format:', dateStr);
      return dateStr; // Zwróć oryginalną datę jeśli nie można sparsować
    }
    
    const day = match[1].padStart(2, '0');
    const month = match[2].toLowerCase();
    const year = match[3];
    
    const monthNumber = monthMap[month];
    if (!monthNumber) {
      console.warn('Unknown month name:', month);
      return dateStr;
    }
    
    const isoDate = `${year}-${monthNumber}-${day}`;
    console.log('Parsed date:', dateStr, '->', isoDate);
    return isoDate;
    
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return dateStr; // Zwróć oryginalną datę w przypadku błędu
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Get all environment variables
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    console.log('Environment check:', { 
      hasServiceKey: !!serviceRoleKey, 
      hasUrl: !!supabaseUrl,
      url: supabaseUrl 
    })
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Parse request
    const requestData: BookingRequest = await req.json()
    
    console.log('📋 Creating booking:', requestData)

    // 1. Create customer record (upsert) - ignore duplicates
    const { error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert({
        email: requestData.email,
        name: requestData.name,
        phone: requestData.phone
      }, { 
        onConflict: 'email',
        ignoreDuplicates: true 
      })

    if (customerError) {
      console.error('Customer error:', customerError)
      // Don't fail the whole booking if customer creation fails
      console.log('⚠️ Proceeding without customer record')
    } else {
      console.log('✅ Customer record handled')
    }

    // 2. Create booking record with correct columns
    // Konwertuj datę z polskiego formatu na ISO
    const parsedDate = parsePolishDate(requestData.date);
    console.log('📅 Original date:', requestData.date, '| Parsed date:', parsedDate);
    
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        booking_id: requestData.bookingId,
        service_type: requestData.service.toLowerCase().replace(/\s+/g, '-'),
        service_name: requestData.service,
        device_type: requestData.device,
        booking_date: parsedDate, // Użyj sparsowanej daty
        booking_time: requestData.time,
        duration_minutes: requestData.duration,
        price: requestData.price,
        status: 'confirmed',
        notes: `Klient: ${requestData.name}, Email: ${requestData.email}, Telefon: ${requestData.phone}${requestData.description ? ', Opis: ' + requestData.description : ''}`
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking error:', bookingError)
      throw new Error(`Booking creation failed: ${bookingError.message}`)
    }

    console.log('✅ Booking created successfully:', booking.id)

    // 3. Send notification email (optional, don't fail if this fails)
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/notify-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: requestData.email,
          bookingData: requestData
        })
      })
      
      if (!emailResponse.ok) {
        console.warn('Email notification failed:', await emailResponse.text())
      } else {
        console.log('✅ Email notification sent')
      }
    } catch (emailError) {
      console.warn('Email notification error:', emailError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingId: requestData.bookingId,
        message: 'Booking created successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Booking creation failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
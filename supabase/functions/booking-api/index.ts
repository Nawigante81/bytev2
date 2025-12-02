// Supabase Edge Function - API dla systemu rezerwacji
// Deno Deploy Compatible

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

interface BookingRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  serviceName: string;
  deviceType: string;
  deviceModel?: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
  notes?: string;
}

interface RepairRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deviceType: string;
  deviceModel?: string;
  deviceDescription: string;
  issueDescription: string;
  priority?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    console.log(`[${method}] ${path}`)

    // Routing
    if (path === '/api/bookings' && method === 'POST') {
      return await createBooking(supabaseClient, req)
    } else if (path === '/api/bookings' && method === 'GET') {
      return await getBookings(supabaseClient, req)
    } else if (path.startsWith('/api/bookings/') && method === 'GET') {
      const bookingId = path.split('/').pop()
      return await getBookingById(supabaseClient, bookingId!, req)
    } else if (path === '/api/repairs' && method === 'POST') {
      return await createRepair(supabaseClient, req)
    } else if (path === '/api/repairs' && method === 'GET') {
      return await getRepairs(supabaseClient, req)
    } else if (path.startsWith('/api/repairs/') && method === 'GET') {
      const repairId = path.split('/').pop()
      return await getRepairById(supabaseClient, repairId!, req)
    } else if (path.startsWith('/api/repairs/') && method === 'PATCH') {
      const repairId = path.split('/').pop()
      return await updateRepairStatus(supabaseClient, repairId!, req)
    } else if (path === '/api/services' && method === 'GET') {
      return await getServices(supabaseClient, req)
    } else if (path === '/api/stats' && method === 'GET') {
      return await getStats(supabaseClient, req)
    }

    return new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error?.message || 'Internal server error' 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// =====================================================
// BOOKING ENDPOINTS
// =====================================================

async function createBooking(supabaseClient: any, req: Request) {
  const bookingData: BookingRequest = await req.json()
  
  // Walidacja danych
  const validation = validateBookingData(bookingData)
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Sprawdź dostępność terminu
    const { data: conflictingBookings } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('booking_date', bookingData.bookingDate)
      .eq('booking_time', bookingData.bookingTime)
      .eq('status', 'confirmed')

    if (conflictingBookings && conflictingBookings.length > 0) {
      return new Response(
        JSON.stringify({ error: { code: 'SLOT_TAKEN', message: 'Ten termin jest już zajęty' } }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Utwórz rezerwację
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        customer_name: bookingData.customerName,
        customer_email: bookingData.customerEmail,
        customer_phone: bookingData.customerPhone,
        service_type: bookingData.serviceType,
        service_name: bookingData.serviceName,
        device_type: bookingData.deviceType,
        device_model: bookingData.deviceModel,
        booking_date: bookingData.bookingDate,
        booking_time: bookingData.bookingTime,
        duration_minutes: bookingData.durationMinutes,
        notes: bookingData.notes,
        status: 'confirmed'
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // Zapisz log emaila
    await logEmailNotification(supabaseClient, {
      type: 'booking_confirmation',
      recipient_email: bookingData.customerEmail,
      recipient_name: bookingData.customerName,
      booking_id: booking.id,
      subject: `Potwierdzenie rezerwacji #${booking.booking_id} - ByteClinic`
    })

    return new Response(
      JSON.stringify({ data: booking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create booking error:', error)
    throw error
  }
}

async function getBookings(supabaseClient: any, req: Request) {
  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  const status = url.searchParams.get('status')
  
  let query = supabaseClient.from('bookings').select(`
    id,
    booking_id,
    customer_name,
    customer_email,
    service_name,
    booking_date,
    booking_time,
    status,
    price,
    created_at
  `)

  if (email) {
    query = query.eq('customer_email', email)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getBookingById(supabaseClient: any, bookingId: string, req: Request) {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Rezerwacja nie znaleziona' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// REPAIR ENDPOINTS
// =====================================================

async function createRepair(supabaseClient: any, req: Request) {
  const repairData: RepairRequest = await req.json()
  
  const validation = validateRepairData(repairData)
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { data: repair, error: repairError } = await supabaseClient
      .from('repairs')
      .insert({
        customer_name: repairData.customerName,
        customer_email: repairData.customerEmail,
        customer_phone: repairData.customerPhone,
        device_type: repairData.deviceType,
        device_model: repairData.deviceModel,
        device_description: repairData.deviceDescription,
        issue_description: repairData.issueDescription,
        priority: repairData.priority || 'normal',
        status: 'received',
        progress: 0
      })
      .select()
      .single()

    if (repairError) throw repairError

    // Dodaj pierwszy wpis do timeline
    await supabaseClient.from('repair_timeline').insert({
      repair_id: repair.id,
      status: 'received',
      title: 'Otrzymano zlecenie',
      description: 'Urządzenie zostało przyjęte do serwisu',
      technician_name: 'System'
    })

    return new Response(
      JSON.stringify({ data: repair }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create repair error:', error)
    throw error
  }
}

async function getRepairs(supabaseClient: any, req: Request) {
  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  const status = url.searchParams.get('status')
  
  let query = supabaseClient.from('repairs').select(`
    id,
    repair_id,
    customer_name,
    customer_email,
    device_model,
    issue_description,
    status,
    progress,
    created_at,
    estimated_completion
  `)

  if (email) {
    query = query.eq('customer_email', email)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRepairById(supabaseClient: any, repairId: string, req: Request) {
  // Pobierz główne dane naprawy
  const { data: repair, error } = await supabaseClient
    .from('repairs')
    .select('*')
    .eq('repair_id', repairId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Naprawa nie znaleziona' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }

  // Pobierz timeline
  const { data: timeline } = await supabaseClient
    .from('repair_timeline')
    .select('*')
    .eq('repair_id', repair.id)
    .order('created_at', { ascending: true })

  return new Response(
    JSON.stringify({ data: { ...repair, timeline } }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateRepairStatus(supabaseClient: any, repairId: string, req: Request) {
  const requestData = await req.json()
  const { status, progress, notes, estimatedCompletion } = requestData
  
  const updateData: any = {}
  if (status) updateData.status = status
  if (progress !== undefined) updateData.progress = progress
  if (notes) updateData.admin_notes = notes
  if (estimatedCompletion) updateData.estimated_completion = estimatedCompletion

  const { data: repair, error } = await supabaseClient
    .from('repairs')
    .update(updateData)
    .eq('repair_id', repairId)
    .select()
    .single()

  if (error) throw error

  // Dodaj wpis do timeline jeśli status się zmienił
  if (status) {
    await supabaseClient.from('repair_timeline').insert({
      repair_id: repair.id,
      status: status,
      title: getStatusTitle(status),
      description: notes || getStatusDescription(status),
      technician_name: 'System'
    })
  }

  return new Response(
    JSON.stringify({ data: repair }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// UTILITY ENDPOINTS
// =====================================================

async function getServices(supabaseClient: any, req: Request) {
  const { data, error } = await supabaseClient
    .from('service_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getStats(supabaseClient: any, req: Request) {
  // Podstawowe statystyki
  const [bookings, repairs] = await Promise.all([
    supabaseClient.from('bookings').select('id', { count: 'exact', head: true }),
    supabaseClient.from('repairs').select('id', { count: 'exact', head: true })
  ])

  return new Response(
    JSON.stringify({
      data: {
        totalBookings: bookings.count || 0,
        totalRepairs: repairs.count || 0,
        monthlyRevenue: 0 // Można dodać funkcję RPC później
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function validateBookingData(data: BookingRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.customerName?.trim()) errors.push('Imię i nazwisko jest wymagane')
  if (!data.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
    errors.push('Prawidłowy adres email jest wymagany')
  }
  if (!data.customerPhone?.trim()) errors.push('Numer telefonu jest wymagany')
  if (!data.serviceType) errors.push('Typ usługi jest wymagany')
  if (!data.bookingDate) errors.push('Data wizyty jest wymagana')
  if (!data.bookingTime) errors.push('Godzina wizyty jest wymagana')

  // Sprawdź czy data nie jest w przeszłości
  const bookingDate = new Date(data.bookingDate)
  if (bookingDate < new Date()) {
    errors.push('Data wizyty nie może być w przeszłości')
  }

  return { isValid: errors.length === 0, errors }
}

function validateRepairData(data: RepairRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.customerName?.trim()) errors.push('Imię i nazwisko jest wymagane')
  if (!data.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
    errors.push('Prawidłowy adres email jest wymagany')
  }
  if (!data.deviceType?.trim()) errors.push('Typ urządzenia jest wymagany')
  if (!data.deviceDescription?.trim()) errors.push('Opis urządzenia jest wymagany')
  if (!data.issueDescription?.trim()) errors.push('Opis problemu jest wymagany')

  return { isValid: errors.length === 0, errors }
}

function getStatusTitle(status: string): string {
  const titles: Record<string, string> = {
    'received': 'Otrzymano zlecenie',
    'diagnosed': 'Diagnoza wykonana',
    'in_progress': 'Rozpoczęto naprawę',
    'testing': 'Testowanie',
    'completed': 'Naprawa zakończona',
    'ready': 'Gotowe do odbioru',
    'delivered': 'Wydano klientowi',
    'cancelled': 'Anulowano'
  }
  return titles[status] || 'Status zaktualizowany'
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    'received': 'Urządzenie zostało przyjęte do serwisu',
    'diagnosed': 'Problem został zidentyfikowany',
    'in_progress': 'Trwają prace nad naprawą',
    'testing': 'Przeprowadzamy testy po naprawie',
    'completed': 'Naprawa została zakończona',
    'ready': 'Urządzenie jest gotowe do odbioru',
    'delivered': 'Urządzenie zostało wydane klientowi',
    'cancelled': 'Naprawa została anulowana'
  }
  return descriptions[status] || 'Status został zaktualizowany'
}

async function logEmailNotification(supabaseClient: any, notification: any) {
  try {
    await supabaseClient.from('email_notifications').insert({
      type: notification.type,
      recipient_email: notification.recipient_email,
      recipient_name: notification.recipient_name,
      booking_id: notification.booking_id,
      repair_id: notification.repair_id,
      subject: notification.subject,
      status: 'pending'
    })
  } catch (error) {
    console.error('Failed to log email notification:', error)
    // Nie przerywamy głównego procesu
  }
}
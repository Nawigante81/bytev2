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

interface RequestRecordInput {
  requestType: string;
  sourcePage: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deviceType?: string;
  deviceModel?: string;
  deviceDescription?: string;
  message?: string;
  priority?: string;
  sourceUrl?: string;
  userAgent?: string;
  consent?: boolean;
}

const REPAIR_STATUS_VALUES = [
  'new_request',
  'open',
  'waiting_for_parts',
  'in_repair',
  'repair_completed',
  'ready_for_pickup'
] as const;

const REPAIR_STATUS_ALIAS: Record<string, typeof REPAIR_STATUS_VALUES[number]> = {
  received: 'new_request',
  new: 'new_request',
  diagnosed: 'open',
  open: 'open',
  waiting_for_parts: 'waiting_for_parts',
  waiting: 'waiting_for_parts',
  in_progress: 'in_repair',
  testing: 'in_repair',
  completed: 'repair_completed',
  closed: 'repair_completed',
  ready: 'ready_for_pickup',
  ready_for_pickup: 'ready_for_pickup'
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const requestId = await createRequestRecord(supabaseClient, {
      requestType: 'booking',
      sourcePage: 'booking_api',
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      customerPhone: bookingData.customerPhone,
      deviceType: bookingData.deviceType,
      deviceModel: bookingData.deviceModel,
      deviceDescription: bookingData.notes || bookingData.serviceName,
      message: bookingData.notes,
      priority: 'normalny',
      sourceUrl: req.headers.get('origin') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      consent: true
    })

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
        status: 'confirmed',
        request_id: requestId
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // Wysyłaj email potwierdzający rezerwację
    try {
      const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-system`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: 'booking_confirmation',
          data: {
            email: bookingData.customerEmail,
            name: bookingData.customerName,
            date: bookingData.bookingDate,
            time: bookingData.bookingTime,
            service: bookingData.serviceName,
            duration: bookingData.durationMinutes,
            price: 0, // Cena będzie określana osobno
            device: bookingData.deviceType,
            phone: bookingData.customerPhone,
            bookingId: booking.booking_id,
            requestId
          }
        })
      })

      if (!notificationResponse.ok) {
        console.error('Błąd wysyłania emaila potwierdzającego:', await notificationResponse.text())
      } else {
        console.log('✅ Email potwierdzający rezerwację wysłany pomyślnie')
      }
    } catch (emailError) {
      console.error('Błąd wywołania systemu powiadomień:', emailError)
      // Nie przerywamy procesu rezerwacji z powodu błędu emaila
    }

    // Zapisz log emaila (dla celów audytowych)
    await logEmailNotification(supabaseClient, {
      type: 'booking_confirmation',
      recipient_email: bookingData.customerEmail,
      recipient_name: bookingData.customerName,
      booking_id: booking.id,
      request_id: requestId,
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
    const requestId = await createRequestRecord(supabaseClient, {
      requestType: 'repair',
      sourcePage: 'repairs_api',
      customerName: repairData.customerName,
      customerEmail: repairData.customerEmail,
      customerPhone: repairData.customerPhone,
      deviceType: repairData.deviceType,
      deviceModel: repairData.deviceModel,
      deviceDescription: repairData.deviceDescription,
      message: repairData.issueDescription,
      priority: repairData.priority || 'normalny',
      sourceUrl: req.headers.get('origin') ?? undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      consent: true
    })

    const initialStatus = 'new_request'
    const initialProgress = getProgressForStatus(initialStatus)
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
        status: initialStatus,
        progress: initialProgress,
        request_id: requestId
      })
      .select()
      .single()

    if (repairError) throw repairError

    // Dodaj pierwszy wpis do timeline
    await supabaseClient.from('repair_timeline').insert({
      repair_id: repair.id,
      status: initialStatus,
      title: getStatusTitle(initialStatus),
      description: getStatusDescription(initialStatus),
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
  const normalizedStatus = status ? normalizeRepairStatus(status) : undefined
  if (status && !normalizedStatus) {
    return new Response(
      JSON.stringify({ error: { code: 'INVALID_STATUS', message: 'Nieobsługiwany status naprawy' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  const updateData: any = {}
  if (normalizedStatus) {
    updateData.status = normalizedStatus
    if (progress === undefined) {
      updateData.progress = getProgressForStatus(normalizedStatus)
    }
  }
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

  // Dodaj wpis do timeline, jeśli to tylko notatka
  if (!normalizedStatus && notes) {
    await supabaseClient.from('repair_timeline').insert({
      repair_id: repair.id,
      status: repair.status,
      title: 'Aktualizacja naprawy',
      description: notes,
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

const STATUS_TITLE_MAP: Record<typeof REPAIR_STATUS_VALUES[number], string> = {
  new_request: 'Nowe zgłoszenie',
  open: 'Zgłoszenie otwarte',
  waiting_for_parts: 'Oczekiwanie na części',
  in_repair: 'Naprawa w toku',
  repair_completed: 'Naprawa zakończona',
  ready_for_pickup: 'Gotowe do odbioru'
}

const STATUS_DESCRIPTION_MAP: Record<typeof REPAIR_STATUS_VALUES[number], string> = {
  new_request: 'Urządzenie zostało przyjęte do serwisu.',
  open: 'Zgłoszenie zostało przypisane do technika.',
  waiting_for_parts: 'Czekamy na dostawę części potrzebnych do naprawy.',
  in_repair: 'Technicy pracują nad Twoim urządzeniem.',
  repair_completed: 'Naprawa została zakończona i trwa testowanie końcowe.',
  ready_for_pickup: 'Urządzenie czeka na odbiór w serwisie.'
}

const STATUS_PROGRESS_MAP: Record<typeof REPAIR_STATUS_VALUES[number], number> = {
  new_request: 10,
  open: 25,
  waiting_for_parts: 40,
  in_repair: 70,
  repair_completed: 90,
  ready_for_pickup: 100
}

function normalizeRepairStatus(status?: string): typeof REPAIR_STATUS_VALUES[number] | undefined {
  if (!status) return undefined
  const normalized = status as typeof REPAIR_STATUS_VALUES[number]
  if (REPAIR_STATUS_VALUES.includes(normalized)) {
    return normalized
  }
  const alias = REPAIR_STATUS_ALIAS[status]
  return alias
}

function getStatusTitle(status: string): string {
  const normalized = normalizeRepairStatus(status)
  if (!normalized) return 'Status zaktualizowany'
  return STATUS_TITLE_MAP[normalized]
}

function getStatusDescription(status: string): string {
  const normalized = normalizeRepairStatus(status)
  if (!normalized) return 'Status został zaktualizowany'
  return STATUS_DESCRIPTION_MAP[normalized]
}

function getProgressForStatus(status: string): number {
  const normalized = normalizeRepairStatus(status)
  if (!normalized) return 0
  return STATUS_PROGRESS_MAP[normalized] ?? 0
}

async function createRequestRecord(supabaseClient: any, payload: RequestRecordInput) {
  try {
    const { data, error } = await supabaseClient.rpc('create_request_with_relations', {
      request_type: payload.requestType,
      source_page: payload.sourcePage,
      customer_name_param: payload.customerName,
      customer_email_param: payload.customerEmail,
      customer_phone_param: payload.customerPhone ?? null,
      device_type_param: payload.deviceType ?? null,
      device_model_param: payload.deviceModel ?? null,
      device_description_param: payload.deviceDescription ?? payload.message ?? null,
      message_param: payload.message ?? null,
      priority_param: payload.priority ?? 'normalny',
      source_url_param: payload.sourceUrl ?? null,
      user_agent_param: payload.userAgent ?? null,
      consent_param: payload.consent ?? false
    })

    if (error) throw error
    return data ?? null
  } catch (rpcError) {
    console.error('Failed to create request record:', rpcError)
    return null
  }
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
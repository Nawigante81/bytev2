// Test script for notify-system Edge Function
// Test powiadomień w Supabase

const SUPABASE_URL = 'https://glwqpjqvivzkbbvluxdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd3FwanF2aXZ6a2Jidmx1eGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NDYsImV4cCI6MjA3NzE1MDQ0Nn0.rxdXK0JNSBt65EGxU1Mb0d-Up0WBq3c6pz6dCvGy5yc';

async function testNotification(template, data) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-system`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template,
      data
    })
  });

  const result = await response.json();
  console.log('Response:', result);
  return result;
}

// Test repair request
async function testRepairRequest() {
  console.log('Testing repair request notification...');
  const result = await testNotification('repair_request', {
    id: 'test-123',
    name: 'Jan Kowalski',
    email: 'test@example.com',
    phone: '+48123456789',
    device: 'Laptop',
    message: 'Test zgłoszenia naprawczego'
  });
  console.log('Repair request test result:', result);
}

// Test booking confirmation
async function testBookingConfirmation() {
  console.log('Testing booking confirmation notification...');
  const result = await testNotification('booking_confirmation', {
    name: 'Anna Nowak',
    email: 'anna@example.com',
    date: '2025-12-05',
    time: '10:00',
    service: 'Diagnoza laptopa'
  });
  console.log('Booking confirmation test result:', result);
}

// Test repair status update
async function testRepairStatusUpdate() {
  console.log('Testing repair status update notification...');
  const result = await testNotification('repair_status_update', {
    repairId: 'rep-456',
    name: 'Piotr Wiśniewski',
    email: 'piotr@example.com',
    status: 'w naprawie',
    progress: 65,
    notes: 'Wymieniono pamięć RAM, trwa testowanie'
  });
  console.log('Repair status update test result:', result);
}

// Uruchom wszystkie testy
async function runTests() {
  try {
    await testRepairRequest();
    console.log('---');
    await testBookingConfirmation();
    console.log('---');
    await testRepairStatusUpdate();
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Uruchom testy jeśli plik jest wykonywany bezpośrednio
if (typeof window === 'undefined') {
  runTests();
}

export { testNotification, testRepairRequest, testBookingConfirmation, testRepairStatusUpdate };
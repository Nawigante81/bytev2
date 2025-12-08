import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

type AdminContext = {
  userId: string;
  email?: string;
  role: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const adminContext = await verifyAdminContext(req.headers.get('Authorization'));
    if (!adminContext) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Brak uprawnień administratora' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      // List users endpoint
      const page = parseInt(url.searchParams.get('page') || '1');
      const perPage = Math.min(Math.max(parseInt(url.searchParams.get('perPage') || '50'), 1), 100);
      const search = url.searchParams.get('search') || '';

      const result = await listUsers({ page, perPage, search });
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST') {
      // Handle user management actions
      const body = await req.json();
      const { action, userId, ...payload } = body;

      let result;
      switch (action) {
        case 'promote-admin':
          result = await updateUserRole(userId, 'admin', payload.fullName);
          break;
        case 'demote-user':
          result = await updateUserRole(userId, 'user');
          break;
        case 'create-profile':
          result = await createUserProfile(userId, payload.fullName || 'Użytkownik');
          break;
        case 'delete-profile':
          result = await deleteUserProfile(userId);
          break;
        default:
          throw new Error(`Nieobsługiwane działanie: ${action}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('admin-users error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Verify that the requester has admin privileges
 */
async function verifyAdminContext(authHeader: string | null): Promise<AdminContext | null> {
  if (!authHeader) {
    return null;
  }

  try {
    // Create client with user token to verify authentication
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data, error } = await supabaseUser.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    // Check if user has admin role in profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      return null;
    }

    return { 
      userId: data.user.id, 
      email: data.user.email || undefined,
      role: profile.role
    };
  } catch (error) {
    console.error('Error verifying admin context:', error);
    return null;
  }
}

/**
 * List users with pagination and search
 */
async function listUsers({ 
  page, 
  perPage, 
  search 
}: { 
  page: number; 
  perPage: number; 
  search: string; 
}) {
  // Get users from auth.admin API
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ 
    page, 
    perPage 
  });
  
  if (error) {
    throw new Error(`Błąd pobierania użytkowników: ${error.message}`);
  }

  const users = data?.users || [];
  const userIds = users.map((u) => u.id);

  // Get user profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('id', userIds);

  // Enrich users with profile data
  const enrichedUsers = users.map((user) => {
    const profile = profiles?.find((p) => p.id === user.id) || null;
    const role = profile?.role || 'no-profile';
    
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      phone: user.phone,
      role,
      hasProfile: !!profile,
      profile
    };
  });

  // Apply search filter
  const filtered = search
    ? enrichedUsers.filter((user) => {
        const email = (user.email || '').toLowerCase();
        const name = (user.profile?.full_name || '').toLowerCase();
        return email.includes(search.toLowerCase()) || name.includes(search.toLowerCase());
      })
    : enrichedUsers;

  return {
    users: filtered,
    stats: {
      total: enrichedUsers.length,
      withProfile: enrichedUsers.filter((u) => u.role !== 'no-profile').length,
      admins: enrichedUsers.filter((u) => u.role === 'admin').length,
      users: enrichedUsers.filter((u) => u.role === 'user').length,
      noProfile: enrichedUsers.filter((u) => u.role === 'no-profile').length
    },
    pagination: { page, perPage, total: filtered.length }
  };
}

/**
 * Update user role
 */
async function updateUserRole(userId: string | undefined, role: string, fullName?: string) {
  if (!userId) {
    throw new Error('Brak userId');
  }

  const payload: Record<string, any> = {
    id: userId,
    role
  };

  if (fullName) {
    payload.full_name = fullName;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(`Błąd aktualizacji roli: ${error.message}`);
  }

  return { userId, role };
}

/**
 * Create user profile
 */
async function createUserProfile(userId: string | undefined, fullName: string) {
  if (!userId) {
    throw new Error('Brak userId');
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName,
      role: 'user'
    });

  if (error) {
    throw new Error(`Błąd tworzenia profilu: ${error.message}`);
  }

  return { userId, role: 'user' };
}

/**
 * Delete user profile
 */
async function deleteUserProfile(userId: string | undefined) {
  if (!userId) {
    throw new Error('Brak userId');
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Błąd usuwania profilu: ${error.message}`);
  }

  return { userId, deleted: true };
}
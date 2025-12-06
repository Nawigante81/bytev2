import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type ActionPayload = {
  action: string;
  payload?: Record<string, any>;
};

type AdminContext = {
  userId: string;
  email?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const adminContext = await requireAdminContext(req.headers.get('Authorization'));
    if (!adminContext) {
      return new Response(JSON.stringify({ success: false, error: 'Brak uprawnień administratora' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: ActionPayload = await req.json();
    const result = await handleAction(body.action, body.payload || {});

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('admin-console error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function requireAdminContext(authHeader: string | null): Promise<AdminContext | null> {
  if (!authHeader) {
    return null;
  }

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

  const { data: profile } = await supabaseService
    .from('profiles')
    .select('id, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return { userId: data.user.id, email: data.user.email };
}

async function handleAction(action: string, payload: Record<string, any>) {
  switch (action) {
    case 'list-users':
      return listUsers(payload);
    case 'promote-admin':
      return updateRole(payload.userId, 'admin', payload.fullName || 'Administrator');
    case 'demote-user':
      return updateRole(payload.userId, 'user');
    case 'create-profile':
      return createProfile(payload.userId, payload.fullName || 'Użytkownik');
    case 'delete-profile':
      return deleteProfile(payload.userId);
    default:
      throw new Error(`Nieobsługiwane działanie: ${action}`);
  }
}

async function listUsers(payload: Record<string, any>) {
  const page = Math.max(1, payload.page || 1);
  const perPage = Math.min(Math.max(payload.perPage || 100, 1), 500);
  const search = (payload.search || '').toLowerCase();

  const { data, error } = await supabaseService.auth.admin.listUsers({ page, perPage });
  if (error) {
    throw error;
  }

  const users = data?.users || [];
  const userIds = users.map((u) => u.id);

  const { data: profiles } = await supabaseService
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const enriched = users.map((user) => {
    const profile = profiles?.find((p) => p.id === user.id) || null;
    const role = profile?.role || 'no-profile';
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      phone: user.phone,
      role,
      profile
    };
  });

  const filtered = search
    ? enriched.filter((user) => {
        const email = (user.email || '').toLowerCase();
        const name = (user.profile?.full_name || '').toLowerCase();
        return email.includes(search) || name.includes(search);
      })
    : enriched;

  return {
    users: filtered,
    stats: {
      total: enriched.length,
      withProfile: enriched.filter((u) => u.role !== 'no-profile').length,
      admins: enriched.filter((u) => u.role === 'admin').length
    },
    pagination: { page, perPage }
  };
}

async function updateRole(userId: string | undefined, role: string, fullName?: string) {
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

  const { error } = await supabaseService
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  return { userId, role };
}

async function createProfile(userId: string | undefined, fullName: string) {
  if (!userId) {
    throw new Error('Brak userId');
  }

  const { error } = await supabaseService
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName,
      role: 'user'
    });

  if (error) {
    throw error;
  }

  return { userId, role: 'user' };
}

async function deleteProfile(userId: string | undefined) {
  if (!userId) {
    throw new Error('Brak userId');
  }

  const { error } = await supabaseService
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    throw error;
  }

  return { userId, deleted: true };
}

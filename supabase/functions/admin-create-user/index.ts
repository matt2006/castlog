import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, username, temp_password, role } = await req.json()

  if (!email || !username || !temp_password) {
    return new Response(JSON.stringify({ error: 'email, username and temp_password are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
  })

  if (createErr || !newUser.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? 'Failed to create user' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: newUser.user.id,
    username,
    role: role ?? 'angler',
    force_password_change: true,
  })

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return new Response(JSON.stringify({ error: `Profile creation failed: ${profileErr.message}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ success: true, userId: newUser.user.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

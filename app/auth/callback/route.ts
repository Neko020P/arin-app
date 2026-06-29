import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single()

  if (profile?.username) {
    return NextResponse.redirect(new URL(`/profile/${profile.username}`, origin))
  }

  const emailPrefix = user.email?.split('@')[0] ?? 'user'
  const username = `${emailPrefix}_${Math.random().toString(36).slice(2, 6)}`

  await supabase.from('profiles').insert({
    user_id: user.id,
    username,
    display_name: emailPrefix,
  })

  if (next) {
    return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL(`/profile/${username}`, origin))
}
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ถ้ามี next param ให้ไปหน้านั้นเลย
  if (next) {
    return NextResponse.redirect(new URL(next, request.url))
  }

  // ไปหน้า profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single()

  const destination = profile?.username
    ? `/profile/${profile.username}`
    : '/dashboard'

  return NextResponse.redirect(new URL(destination, request.url))
}
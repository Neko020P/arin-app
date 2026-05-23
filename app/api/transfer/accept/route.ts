import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'ไม่พบ token' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ไม่ได้ login' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'ไม่พบ profile' }, { status: 404 })
  console.log('profile:', profile)

  const { data: transfer } = await supabase
    .from('character_transfers')
    .select('*, character:character_id(id, name)')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!transfer) return NextResponse.json({ error: 'ไม่พบ transfer หรือหมดอายุแล้ว' }, { status: 404 })

  if (new Date(transfer.expires_at) < new Date()) {
    await supabase
      .from('character_transfers')
      .update({ status: 'cancelled' })
      .eq('id', transfer.id)
    return NextResponse.json({ error: 'link หมดอายุแล้ว (48 ชั่วโมง)' }, { status: 410 })
  }

  if (transfer.to_username !== profile.username) {
    return NextResponse.json({ error: 'link นี้ไม่ได้ส่งให้คุณ' }, { status: 403 })
  }
  console.log('transfer:', transfer)

  // โอน ownership ด้วย admin client (bypass RLS)
  const { error: updateErr } = await adminSupabase
    .from('characters')
    .update({ owner_id: profile.id })
    .eq('id', transfer.character_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  console.log('updateErr:', updateErr)

  await adminSupabase
    .from('character_transfers')
    .update({ status: 'accepted' })
    .eq('id', transfer.id)

  return NextResponse.json({
    success: true,
    characterId: transfer.character_id,
    characterName: (transfer.character as any).name,
  })
}
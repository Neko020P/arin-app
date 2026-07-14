import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // เช็ค env var ก่อนเลย — ถ้าขาดจะได้ error message ที่อ่านออก
    // แทนที่จะ throw แบบเงียบตอนสร้าง client
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[transfer/accept] Missing SUPABASE_SERVICE_ROLE_KEY env var')
      return NextResponse.json(
        { error: 'Server misconfigured: missing service role key' },
        { status: 500 }
      )
    }

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

    // โอน ownership ด้วย admin client (bypass RLS)
    const { data: updated, error: updateErr } = await adminSupabase
      .from('characters')
      .update({ owner_id: profile.id })
      .eq('id', transfer.character_id)
      .select('id')

    if (updateErr) {
      console.error('[transfer/accept] characters update failed:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // update() ไม่ throw error ถ้าไม่ match แถวไหนเลย ต้องเช็คแยกว่ามีแถวถูกแก้จริง
    if (!updated || updated.length === 0) {
      console.error('[transfer/accept] characters update matched 0 rows for character_id:', transfer.character_id)
      return NextResponse.json({ error: 'ไม่พบตัวละครที่จะโอน (update matched 0 rows)' }, { status: 500 })
    }

    const { error: statusErr } = await adminSupabase
      .from('character_transfers')
      .update({ status: 'accepted' })
      .eq('id', transfer.id)

    if (statusErr) {
      // ownership โอนสำเร็จแล้ว แค่ mark สถานะไม่ผ่าน — ไม่ควร fail ทั้ง request
      // แต่ต้อง log ไว้ให้เห็น ไม่ใช่กลืนเงียบ ๆ เหมือนเดิม
      console.error('[transfer/accept] failed to mark transfer as accepted:', statusErr)
    }

    return NextResponse.json({
      success: true,
      characterId: transfer.character_id,
      characterName: (transfer.character as any).name,
    })
  } catch (err) {
    console.error('[transfer/accept] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด' },
      { status: 500 }
    )
  }
}
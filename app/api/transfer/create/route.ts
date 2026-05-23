import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { characterId, toUsername } = await req.json()

  if (!characterId || !toUsername) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
  }

  // เช็ค auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ไม่ได้ login' }, { status: 401 })

  // เช็คว่าเป็นเจ้าของจริง
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'ไม่พบ profile' }, { status: 404 })

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, owner_id')
    .eq('id', characterId)
    .eq('owner_id', profile.id)
    .single()

  if (!character) return NextResponse.json({ error: 'ไม่พบ character หรือไม่มีสิทธิ์' }, { status: 403 })

  // เช็คว่า toUsername มีอยู่จริง
  const { data: toProfile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', toUsername)
    .single()

  if (!toProfile) return NextResponse.json({ error: `ไม่พบ user "${toUsername}"` }, { status: 404 })

  if (toProfile.id === profile.id) {
    return NextResponse.json({ error: 'ไม่สามารถโอนให้ตัวเองได้' }, { status: 400 })
  }

  // ยกเลิก transfer เดิมที่ pending อยู่
  await supabase
    .from('character_transfers')
    .update({ status: 'cancelled' })
    .eq('character_id', characterId)
    .eq('status', 'pending')

  // สร้าง transfer ใหม่
  const { data: transfer, error } = await supabase
    .from('character_transfers')
    .insert({
      character_id: characterId,
      from_owner_id: profile.id,
      to_username: toUsername,
    })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: transfer.token })
}
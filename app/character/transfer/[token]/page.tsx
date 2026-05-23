import { createClient } from '@/lib/supabase/server'
import TransferAcceptClient from './TransferAcceptClient'

type Props = {
  params: Promise<{ token: string }>
}

export default async function TransferAcceptPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // ดึงข้อมูล transfer
  const { data: transfer } = await supabase
    .from('character_transfers')
    .select('*, character:character_id(id, name, room_sprite_url, ref_sheet_url), from_owner:from_owner_id(username)')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!transfer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-white text-xl font-bold mb-2">ไม่พบ Transfer</h1>
          <p className="text-white/50 text-sm">link นี้ไม่มีอยู่ หมดอายุ หรือถูกยกเลิกแล้ว</p>
        </div>
      </div>
    )
  }

  const expired = new Date(transfer.expires_at) < new Date()
  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-white text-xl font-bold mb-2">Link หมดอายุแล้ว</h1>
          <p className="text-white/50 text-sm">ขอให้เจ้าของส่ง link ใหม่อีกครั้ง</p>
        </div>
      </div>
    )
  }

  const character = transfer.character as any
  const fromOwner = transfer.from_owner as any

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] p-4">
      <TransferAcceptClient
        token={token}
        characterId={character.id}
        characterName={character.name}
        characterSprite={character.room_sprite_url ?? character.ref_sheet_url ?? null}
        fromUsername={fromOwner.username}
        toUsername={transfer.to_username}
        expiresAt={transfer.expires_at}
      />
    </div>
  )
}
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  token: string
  characterId: string
  characterName: string
  characterSprite: string | null
  fromUsername: string
  toUsername: string
  expiresAt: string
}

export default function TransferAcceptClient({
  token, characterId, characterName, characterSprite,
  fromUsername, toUsername, expiresAt,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const expiresIn = Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))

  async function handleAccept() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/transfer/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }
    router.push(`/character/${characterId}`)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: 40,
      maxWidth: 420,
      width: '100%',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        รับ Character
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
        <b style={{ color: 'white' }}>{fromUsername}</b> wants to transfer the character to you
      </p>

      {/* Character card */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        textAlign: 'left',
      }}>
        {characterSprite ? (
          <img
            src={characterSprite}
            alt={characterName}
            style={{ width: 64, height: 64, objectFit: 'contain', imageRendering: 'pixelated' }}
          />
        ) : (
          <div style={{ fontSize: 48 }}>🐾</div>
        )}
        <div>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>{characterName}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
            จาก @{fromUsername} → @{toUsername}
          </div>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 20 }}>
        ⏰ link will expire in {expiresIn} hour{expiresIn !== 1 ? 's' : ''}
      </p>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      <button
        onClick={handleAccept}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 0',
          background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6c63ff, #48bfe3)',
          border: 'none',
          borderRadius: 10,
          color: 'white',
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ กำลังดำเนินการ...' : '✅ รับ Character'}
      </button>

      <button
        onClick={() => router.push('/')}
        style={{
          marginTop: 12,
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        ปฏิเสธ
      </button>
    </div>
  )
}
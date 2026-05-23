'use client'
import { useState } from 'react'

type Props = {
  characterId: string
  characterName: string
}

export default function TransferOwnershipPanel({ characterId, characterName }: Props) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transferLink, setTransferLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    if (!username.trim()) return
    setLoading(true)
    setError('')
    setTransferLink(null)

    const res = await fetch('/api/transfer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, toUsername: username.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }

    const link = `${window.location.origin}/character/transfer/${data.token}`
    setTransferLink(link)
    setLoading(false)
  }

  function handleCopy() {
    if (!transferLink) return
    navigator.clipboard.writeText(transferLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setOpen(false)
    setUsername('')
    setError('')
    setTransferLink(null)
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,100,100,0.3)',
            color: 'rgba(255,100,100,0.7)',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          🔄 โอน Character ให้คนอื่น
        </button>
      ) : (
        <div style={{
          background: 'rgba(255,50,50,0.05)',
          border: '1px solid rgba(255,100,100,0.2)',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            🔄 โอน "{characterName}"
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 }}>
            กรอก username ผู้รับ แล้วส่ง link ให้เขากด Accept — link มีอายุ 48 ชั่วโมง
          </p>

          {!transferLink ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="username ผู้รับ"
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: 'white',
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={loading || !username.trim()}
                  style={{
                    background: 'rgba(255,100,100,0.2)',
                    border: '1px solid rgba(255,100,100,0.3)',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: !username.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? '⏳' : 'สร้าง Link'}
                </button>
              </div>

              {error && (
                <p style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 8 }}>{error}</p>
              )}
            </>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: 'rgba(120,255,120,0.8)', fontSize: 12, marginBottom: 8 }}>
                ✅ สร้าง link สำเร็จ! ส่งให้ <b>@{username}</b> กด Accept
              </p>
              <div style={{
                display: 'flex',
                gap: 8,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '8px 12px',
                alignItems: 'center',
              }}>
                <span style={{
                  flex: 1,
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {transferLink}
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? 'rgba(120,255,120,0.2)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 6 }}>
                ⏰ หมดอายุใน 48 ชั่วโมง
              </p>
            </div>
          )}

          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  )
}
'use client'
import { useState } from 'react'

export default function CopyRoomLink({ characterId }: { characterId: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/character/${characterId}/room`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? 'rgba(120,255,120,0.15)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${copied ? 'rgba(120,255,120,0.3)' : 'rgba(255,255,255,0.15)'}`,
        color: copied ? 'rgba(120,255,120,0.9)' : 'rgba(255,255,255,0.5)',
        padding: '4px 12px',
        borderRadius: 8,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: 80,
      }}
    >
      {copied ? '✅ Copied!' : '🔗 แชร์'}
    </button>
  )
}
'use client'
import { useEffect, useState } from 'react'

type Props = {
    text: string | null
    spriteUrl: string
    characterName: string
}

export default function ChatBubble({ text, spriteUrl, characterName }: Props) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!text) return
        setVisible(true)
        const t = setTimeout(() => setVisible(false), 7000)
        return () => clearTimeout(t)
    }, [text])

    if (!visible || !text) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 24,
                right: 320,
                zIndex: 100,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                animation: 'chatIn 0.3s ease-out',
                pointerEvents: 'none',
            }}
        >
            {/* Bubble */}
            <div style={{
                background: 'rgba(255,255,255,0.97)',
                borderRadius: '18px 18px 4px 18px',
                padding: '10px 14px',
                maxWidth: 260,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                color: '#1a1a2e',
                fontSize: 14,
                lineHeight: 1.5,
                fontWeight: 500,
            }}>
                <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 4 }}>
                    {characterName}
                </div>
                {text}
            </div>

            {/* Sprite avatar */}
            <img
                src={spriteUrl}
                alt={characterName}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(167,139,250,0.5)',
                    background: 'rgba(255,255,255,0.1)',
                    flexShrink: 0,
                }}
            />

            <style>{`
        @keyframes chatIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    )
}
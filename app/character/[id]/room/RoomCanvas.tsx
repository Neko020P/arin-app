'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  spriteUrl: string
  bgUrl: string | null
}

export default function RoomCanvas({ spriteUrl, bgUrl }: Props) {
  const [spriteLoaded, setSpriteLoaded] = useState(false)

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        maxWidth: 640,
        aspectRatio: '16/9',
        background: bgUrl ? undefined : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Background */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt="room background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Default bg ถ้าไม่มี */}
      {!bgUrl && (
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <div
            className="w-full h-px opacity-20"
            style={{ background: 'linear-gradient(90deg, transparent, #fff, transparent)' }}
          />
        </div>
      )}

      {/* Character sprite */}
      <div
        className="absolute"
        style={{
          bottom: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '55%',
        }}
      >
        <img
          src={spriteUrl}
          alt="character"
          onLoad={() => setSpriteLoaded(true)}
          className="h-full w-auto object-contain select-none"
          style={{
            animation: spriteLoaded ? 'breathe 3.5s ease-in-out infinite' : 'none',
            transformOrigin: 'bottom center',
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
          }}
          draggable={false}
        />
      </div>

      {/* กรณียังโหลดไม่เสร็จ */}
      {!spriteLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {/* CSS animation */}
      <style>{`
        @keyframes breathe {
          0%   { transform: scaleX(1)    scaleY(1);    }
          30%  { transform: scaleX(1.02) scaleY(0.98); }
          50%  { transform: scaleX(0.98) scaleY(1.02); }
          70%  { transform: scaleX(1.01) scaleY(0.99); }
          100% { transform: scaleX(1)    scaleY(1);    }
        }
      `}</style>
    </div>
  )
}
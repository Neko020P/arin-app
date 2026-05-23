'use client'
import { useEffect, useRef, useState } from 'react'

type Particle = {
  id: number
  x: number
  y: number
  emoji: string
  vx: number
  vy: number
}

type Props = {
  trigger: string | null
  posX: number
  posY: number
  happiness: number
}

const ACTION_PARTICLES: Record<string, string[]> = {
  feed:  ['🍖', '✨', '😋'],
  play:  ['⭐', '🎾', '✨', '💫'],
  bath:  ['💧', '✨', '🫧'],
  sleep: ['💤', '⭐', '🌙'],
}

export default function ParticleEffect({ trigger, posX, posY, happiness }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    if (!trigger) return
    const emojis = ACTION_PARTICLES[trigger] ?? ['✨']
    const newParticles: Particle[] = Array.from({ length: 6 }, (_, i) => ({
      id: nextId.current++,
      x: posX,
      y: posY,
      emoji: emojis[i % emojis.length],
      vx: (Math.random() - 0.5) * 4,
      vy: -(2 + Math.random() * 3),
    }))
    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)))
    }, 1500)
  }, [trigger])

  useEffect(() => {
    if (happiness < 80) return
    const interval = setInterval(() => {
      const heart: Particle = {
        id: nextId.current++,
        x: posX + (Math.random() - 0.5) * 10,
        y: posY + 30 + Math.random() * 20,
        emoji: Math.random() > 0.5 ? '❤️' : '✨',
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1 + Math.random()),
      }
      setParticles(prev => [...prev, heart])
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== heart.id))
      }, 2000)
    }, 2000)
    return () => clearInterval(interval)
  }, [happiness, posX])

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none text-lg"
          style={{
            position: 'absolute',
            left: posX + p.x,
            top: posY + p.y,
            zIndex: 25,
            animation: `particleFloat 1.5s ease-out forwards`,
            '--tx': `${(Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 30)}px`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes particleFloat {
          0%   { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), -60px) scale(0.5); }
        }
      `}</style>
    </>
  )
}
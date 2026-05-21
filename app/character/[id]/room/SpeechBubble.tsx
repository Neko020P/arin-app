'use client'
import { useEffect, useState } from 'react'
import type { Stats } from '@/lib/stats'
import { PERSONALITY_BUBBLES, PERSONALITY_CONFIG, type Personality } from '@/lib/personality'

type Props = {
    stats: Stats
    posX: number
    posY: number
    lastAction: string | null
    personality: Personality
}

const BUBBLES: Record<string, string[]> = {
    hungry: ['หิวแล้ว~ 🍖', 'ท้องร้องแล้ว...', 'ขอกินหน่อยได้ไหม 🥺', 'อาหารอยู่ไหนนะ'],
    tired: ['ง่วงจัง 💤', 'ขอนอนแป๊บนึงได้ไหม', 'หาวๆ...', 'ตาปรือแล้ว'],
    happy: ['วันนี้ดีจัง ✨', 'มีความสุขมากเลย 🌟', 'เย้~ 🎉', 'ชีวิตดี~'],
    sad: ['เหงาจัง...', 'มาเล่นด้วยกันไหม 🥺', 'อยากได้รับการดูแล', 'หม่นๆ...'],
    bored: ['ทำอะไรดีนะ...', 'เล่นด้วยกันไหม 🎾', 'น่าเบื่อจัง', 'มีอะไรสนุกไหม'],
    afterFeed: ['อร่อยมาก! 😋', 'ขอบคุณนะ~ 🍖', 'อิ่มแล้ว ✨'],
    afterPlay: ['สนุกจัง! 🎾', 'เล่นอีกได้ไหม~', 'ฮาฮา! ⭐'],
    afterBath: ['สะอาดแล้ว~ 🛁', 'หอมเลย ✨', 'สดชื่นมาก!'],
    afterSleep: ['ตื่นแล้ว~ 💤', 'หายง่วงแล้ว!', 'นอนหลับสบายมาก ✨'],
    morning: ['อรุณสวัสดิ์~ ☀️', 'ตื่นนอนแล้ว!', 'วันนี้จะดีแน่ๆ'],
    night: ['ง่วงแล้ว 🌙', 'กลางคืนแล้วนะ', 'ฝันดีนะ~ 💤'],
}

function getBubbleCategory(stats: Stats, lastAction: string | null): string {
    if (lastAction) return `after${lastAction.charAt(0).toUpperCase() + lastAction.slice(1)}`

    const h = new Date().getHours()
    if (h >= 6 && h < 9) return 'morning'
    if (h >= 21 || h < 6) return 'night'

    const avg = (stats.hunger + stats.happiness + stats.energy) / 3

    if (stats.hunger < 25) return 'hungry'
    if (stats.energy < 25) return 'tired'
    if (stats.happiness < 25) return 'sad'
    if (avg > 75) return 'happy'
    return 'bored'
}

function pickRandom(arr: string[]) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export default function SpeechBubble({ stats, posX, posY, lastAction, personality }: Props) {
    const [text, setText] = useState<string | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (lastAction) {
            const category = `after${lastAction.charAt(0).toUpperCase() + lastAction.slice(1)}`
            const options = (PERSONALITY_BUBBLES[personality] ?? PERSONALITY_BUBBLES['friendly'])[category]
                ?? (PERSONALITY_BUBBLES[personality] ?? PERSONALITY_BUBBLES['friendly']).happy
                ?? ['...']
            setText(pickRandom(options))
            setVisible(true)
            const t = setTimeout(() => setVisible(false), 2500)
            return () => clearTimeout(t)
        }
    }, [lastAction])

    useEffect(() => {
        //const config = PERSONALITY_CONFIG[personality]
        const bubbleConfig = PERSONALITY_CONFIG[personality] ?? PERSONALITY_CONFIG['friendly']

        function showBubble() {
            // เช็ค chance ก่อน
            if (Math.random() > bubbleConfig.bubbleChance) return

            const h = new Date().getHours()
            let category = 'bored'
            if (h >= 6 && h < 9) category = 'morning'
            else if (h >= 21 || h < 6) category = 'night'
            else if (stats.hunger < 25) category = 'hungry'
            else if (stats.energy < 25) category = 'tired'
            else if (stats.happiness < 25) category = 'sad'
            else {
                const avg = (stats.hunger + stats.happiness + stats.energy) / 3
                if (avg > 75) category = 'happy'
            }

            const options = (PERSONALITY_BUBBLES[personality] ?? PERSONALITY_BUBBLES['friendly'])[category] ?? ['...']
            setText(pickRandom(options))
            setVisible(true)
            setTimeout(() => setVisible(false), 3000)
        }

        const delay = 2000 //bubbleConfig.bubbleFrequency * (0.8 + Math.random() * 0.4)
        const t = setTimeout(() => showBubble(), delay)
        return () => clearTimeout(t)
    }, [stats, visible, personality])

    useEffect(() => {
        setVisible(false)
        setText(null)
    }, [personality])

    if (!visible || !text) return null

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                position: 'absolute',
                left: posX,
                top: posY - 120,   // ลอยเหนือหัว
                transform: 'translateX(-50%)',
                zIndex: 30,
                animation: 'bubbleIn 0.3s ease-out',
            }}
        >
            <div
                className="relative whitespace-nowrap rounded-2xl px-3 py-1.5 text-sm font-medium shadow-lg"
                style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a2e',
                    maxWidth: 200,
                    whiteSpace: 'normal',
                    textAlign: 'center',
                }}
            >
                {text}
                {/* หาง bubble */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(255,255,255,0.95)',
                    }}
                />
            </div>

            <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
      `}</style>
        </div>
    )
}
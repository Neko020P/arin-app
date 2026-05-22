'use client'
import type { Stats } from '@/lib/stats'

const BAR_CONFIG = [
  { key: 'hunger',    label: 'ความหิว',   icon: '🍖', color: 'bg-orange-400' },
  { key: 'happiness', label: 'ความสุข',   icon: '😊', color: 'bg-pink-400'   },
  { key: 'energy',    label: 'พลังงาน',   icon: '⚡', color: 'bg-yellow-400' },
] as const

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      {BAR_CONFIG.map(({ key, label, icon, color }) => {
        const val = Math.round(stats[key])
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-base w-5">{icon}</span>
            <span className="text-xs text-white/50 w-14">{label}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color} ${val < 25 ? 'animate-pulse' : ''}`}
                style={{ width: `${val}%` }}
              />
            </div>
            <span className="text-xs text-white/40 w-7 text-right">{val}</span>
          </div>
        )
      })}
    </div>
  )
}
export type Stats = {
  hunger: number
  happiness: number
  energy: number
}

export const DECAY_RATES: Record<keyof Stats, number> = {
  hunger: 500,  // test
  happiness: 500,  // test
  energy: 500,  // test
  // hunger:    10,
  // happiness:  5,
  // energy:     4,
}

export const ACTION_EFFECTS: Record<string, Partial<Stats>> = {
  feed: { hunger: +30, happiness: +5 },
  play: { hunger: -5, happiness: +25, energy: -15 },
  bath: { happiness: +10, energy: -5 },
  sleep: { energy: +40 },
}

export function calcCurrentStats(saved: Stats, lastUpdated: string): Stats {
  const hours = (Date.now() - new Date(lastUpdated).getTime()) / 3_600_000
  return {
    hunger: clamp(saved.hunger - DECAY_RATES.hunger * hours),
    happiness: clamp(saved.happiness - DECAY_RATES.happiness * hours),
    energy: clamp(saved.energy - DECAY_RATES.energy * hours),
  }
}

export function applyAction(current: Stats, action: string): Stats {
  const effect = ACTION_EFFECTS[action] ?? {}
  return {
    hunger: clamp((current.hunger ?? 0) + (effect.hunger ?? 0)),
    happiness: clamp((current.happiness ?? 0) + (effect.happiness ?? 0)),
    energy: clamp((current.energy ?? 0) + (effect.energy ?? 0)),
  }
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)) }
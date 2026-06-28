export type Stats = {
  hunger: number
  happiness: number
  energy: number
  social: number
}

export const DECAY_RATES: Record<keyof Stats, number> = {
  hunger: 120,
  happiness: 80,
  energy: 80,
  social: 40,
}

export const ACTION_EFFECTS: Record<string, Partial<Stats>> = {
  feed: { hunger: +30, happiness: +5 },
  play: { hunger: -5, happiness: +25, energy: -15 },
  bath: { happiness: +10, energy: -5 },
  sleep: { energy: +40 },
}

export const SOCIAL_EFFECTS = {
  stranger: +5,
  friend: +15,
  rival: +3,
}

export function calcCurrentStats(saved: Stats, lastUpdated: string): Stats {
  const parsed = new Date(lastUpdated)
  const timestamp = parsed.getTime()
  if (!lastUpdated || Number.isNaN(timestamp)) {
    return {
      hunger: clamp(saved.hunger),
      happiness: clamp(saved.happiness),
      energy: clamp(saved.energy),
      social: clamp(saved.social ?? 80),
    }
  }

  const hours = Math.max(0, (Date.now() - timestamp) / 3_600_000)
  return {
    hunger: clamp(saved.hunger - DECAY_RATES.hunger * hours),
    happiness: clamp(saved.happiness - DECAY_RATES.happiness * hours),
    energy: clamp(saved.energy - DECAY_RATES.energy * hours),
    social: clamp((saved.social ?? 80) - DECAY_RATES.social * hours),
  }
}

export function applyAction(current: Stats, action: string): Stats {
  const effect = ACTION_EFFECTS[action] ?? {}
  return {
    hunger: clamp((current.hunger ?? 0) + (effect.hunger ?? 0)),
    happiness: clamp((current.happiness ?? 0) + (effect.happiness ?? 0)),
    energy: clamp((current.energy ?? 0) + (effect.energy ?? 0)),
    social: clamp(current.social ?? 80),
  }
}

export function applyCustomAction(current: Stats, effects: Partial<Stats>): Stats {
  return {
    hunger: clamp((current.hunger ?? 0) + (effects.hunger ?? 0)),
    happiness: clamp((current.happiness ?? 0) + (effects.happiness ?? 0)),
    energy: clamp((current.energy ?? 0) + (effects.energy ?? 0)),
    social: clamp((current.social ?? 0) + (effects.social ?? 0)),
  }
}

export function applySocialBoost(current: Stats, tier: string): Stats {
  const boost = SOCIAL_EFFECTS[tier as keyof typeof SOCIAL_EFFECTS] ?? 5
  return {
    ...current,
    social: clamp((current.social ?? 80) + boost),
    happiness: clamp((current.happiness ?? 80) + Math.floor(boost / 3)),
  }
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)) }
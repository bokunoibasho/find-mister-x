import type { MapId } from './board'
import type { Difficulty, DetectiveTickets, Mode, MrXTickets, Role } from './types'

export interface ModePreset {
  mapId: MapId
  totalRounds: number
  detectiveTickets: DetectiveTickets
  mrxTickets: MrXTickets
  mrxDoubleMoves: number
  maxDetectives: number
  defaultDetectives: number
  detectiveCounts: number[]
  hintDefault: boolean
  defaultDifficulty: Difficulty
  /** Rounds where Mr X hides (used when he is otherwise mostly visible). */
  hiddenRounds: number[]
  /** Rounds where Mr X surfaces (used when he is otherwise mostly hidden). */
  surfaceRounds: number[]
  /** When the human is a detective, Mr X is shown most rounds (beginner). */
  mostlyVisibleForDetective: boolean
}

export const MODE_PRESETS: Record<Mode, ModePreset> = {
  beginner: {
    mapId: 'beginner',
    totalRounds: 13,
    detectiveTickets: { taxi: 99, bus: 99, underground: 0 },
    mrxTickets: { taxi: 99, bus: 99, underground: 0, black: 1 },
    mrxDoubleMoves: 1,
    maxDetectives: 4,
    defaultDetectives: 3,
    detectiveCounts: [3, 4],
    hintDefault: true,
    defaultDifficulty: 'easy',
    hiddenRounds: [3, 8, 13],
    surfaceRounds: [3, 8, 13],
    mostlyVisibleForDetective: true
  },
  classic: {
    mapId: 'classic',
    totalRounds: 24,
    detectiveTickets: { taxi: 10, bus: 8, underground: 4 },
    mrxTickets: { taxi: 99, bus: 99, underground: 99, black: 5 },
    mrxDoubleMoves: 2,
    maxDetectives: 5,
    defaultDetectives: 4,
    detectiveCounts: [3, 4, 5],
    hintDefault: false,
    defaultDifficulty: 'normal',
    hiddenRounds: [],
    surfaceRounds: [3, 8, 13, 18, 24],
    mostlyVisibleForDetective: false
  }
}

export function mrxMostlyVisible(preset: ModePreset, role: Role): boolean {
  return preset.mostlyVisibleForDetective && role === 'detective'
}

/** Rounds on which Mr X's position is made public, given mode + player role. */
export function buildReveals(preset: ModePreset, role: Role): number[] {
  if (mrxMostlyVisible(preset, role)) {
    const reveals: number[] = []
    for (let r = 1; r <= preset.totalRounds; r++) {
      if (!preset.hiddenRounds.includes(r)) reveals.push(r)
    }
    return reveals
  }
  return [...preset.surfaceRounds]
}

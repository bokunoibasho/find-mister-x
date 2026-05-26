import { neighborsByTransport, neighborsWithTypes } from './board'
import type { GameState, Move, Transport } from './types'

export const TRANSPORTS: Transport[] = ['taxi', 'bus', 'underground']

export const DETECTIVE_PALETTE = [
  { name: '赤', color: '#e5484d' },
  { name: '青', color: '#3b82f6' },
  { name: '緑', color: '#22c55e' },
  { name: '黄', color: '#eab308' },
  { name: '紫', color: '#a855f7' }
]

export const MRX_COLOR = '#0f1226'

export function isRevealRound(reveals: number[], round: number): boolean {
  return reveals.includes(round)
}

/** Next round (> current) on which Mr X surfaces. */
export function nextRevealRound(reveals: number[], round: number): number | null {
  const future = reveals.filter((r) => r > round).sort((a, b) => a - b)
  return future.length ? future[0] : null
}

/** Next round (> current, <= total) on which Mr X hides (not in `reveals`). */
export function nextHiddenRound(reveals: number[], total: number, round: number): number | null {
  for (let r = round + 1; r <= total; r++) if (!reveals.includes(r)) return r
  return null
}

export function detectiveAt(state: GameState, station: number): number {
  return state.detectives.findIndex((d) => d.position === station)
}

function detectiveOccupies(state: GameState, station: number, exceptIndex = -1): boolean {
  return state.detectives.some((d, i) => i !== exceptIndex && d.position === station)
}

/** Legal single-step moves for the given detective. */
export function detectiveLegalMoves(state: GameState, index: number): Move[] {
  const det = state.detectives[index]
  const moves: Move[] = []
  for (const t of TRANSPORTS) {
    if (det.tickets[t] <= 0) continue
    for (const to of neighborsByTransport(det.position, t)) {
      if (detectiveOccupies(state, to, index)) continue
      moves.push({ to, ticket: t })
    }
  }
  return moves
}

/** Legal single-step moves for Mr X (used directly and as each leg of a double). */
export function mrxLegalMoves(state: GameState): Move[] {
  const from = state.mrx.position
  const moves: Move[] = []
  for (const t of TRANSPORTS) {
    if (state.mrx.tickets[t] <= 0) continue
    for (const to of neighborsByTransport(from, t)) {
      if (detectiveOccupies(state, to)) continue
      moves.push({ to, ticket: t })
    }
  }
  if (state.mrx.tickets.black > 0) {
    for (const { to } of neighborsWithTypes(from)) {
      if (detectiveOccupies(state, to)) continue
      moves.push({ to, ticket: 'black' })
    }
  }
  return moves
}

export function anyDetectiveCanMove(state: GameState): boolean {
  return state.detectives.some((_, i) => detectiveLegalMoves(state, i).length > 0)
}

export function mrxCanMove(state: GameState): boolean {
  return mrxLegalMoves(state).length > 0
}

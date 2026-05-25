import { distance, neighborsWithTypes } from '../board'
import { canUseDouble } from '../engine'
import { isRevealRound, mrxLegalMoves } from '../rules'
import type { Difficulty, GameState, Move } from '../types'

export interface MrXPlan {
  moves: Move[]
  double: boolean
}

function minDetectiveDistance(state: GameState, station: number): number {
  let best = Infinity
  for (const d of state.detectives) best = Math.min(best, distance(d.position, station))
  return best
}

function scoreMove(state: GameState, move: Move, difficulty: Difficulty): number {
  const to = move.to
  const dmin = minDetectiveDistance(state, to)
  let score = dmin * 2

  // Avoid squares a detective can reach next turn.
  if (dmin <= 1) score -= 8
  if (difficulty !== 'easy') {
    const closing = state.detectives.filter((d) => distance(d.position, to) <= 2).length
    score -= closing * 1.3
  }

  // Keep escape options open.
  score += neighborsWithTypes(to).length * 0.12

  // Use black tickets sparingly: most valuable right after surfacing (to hide
  // the follow-up) — the round just played being a reveal means he just surfaced.
  if (move.ticket === 'black') {
    const justSurfaced = isRevealRound(state.round + 1)
    score += justSurfaced ? 0.6 : -0.7
  }
  return score
}

function bestMove(state: GameState, difficulty: Difficulty): Move {
  const moves = mrxLegalMoves(state)
  const scored = moves
    .map((m) => ({ m, s: scoreMove(state, m, difficulty) }))
    .sort((a, b) => b.s - a.s)
  if (difficulty === 'easy') {
    const top = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.5)))
    return top[Math.floor(Math.random() * top.length)].m
  }
  const best = scored[0].s
  const ties = scored.filter((x) => x.s >= best - 0.001)
  return ties[Math.floor(Math.random() * ties.length)].m
}

/** Decide Mr X's move(s) for this turn, optionally chaining a double move. */
export function planMrxTurn(state: GameState, difficulty: Difficulty): MrXPlan {
  const threatened = minDetectiveDistance(state, state.mrx.position) <= 2
  const wantsDouble =
    difficulty !== 'easy' && canUseDouble(state) && threatened && Math.random() < 0.8

  const first = bestMove(state, difficulty)
  if (!wantsDouble) return { moves: [first], double: false }

  // Simulate the first leg to choose a sensible second leg.
  const sim: GameState = structuredClone(state)
  sim.mrx.position = first.to
  if (first.ticket === 'black') sim.mrx.tickets.black -= 1
  else sim.mrx.tickets[first.ticket] -= 1
  sim.round += 1
  const second = bestMove(sim, difficulty)
  return { moves: [first, second], double: true }
}

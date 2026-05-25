import { distance } from '../board'
import { detectiveLegalMoves } from '../rules'
import type { Difficulty, GameState, Move } from '../types'
import { computeBelief } from './belief'

function nearestBelief(belief: number[], from: number): { station: number; dist: number } {
  let station = belief[0]
  let best = Infinity
  for (const b of belief) {
    const d = distance(from, b)
    if (d < best) {
      best = d
      station = b
    }
  }
  return { station, dist: best }
}

function scoreMove(
  state: GameState,
  move: Move,
  belief: number[],
  beliefSet: Set<number>,
  selfIndex: number
): number {
  // Primary: get closer to the nearest possible Mr X location.
  const { dist } = nearestBelief(belief, move.to)
  let score = dist

  // Strong incentive to step onto a possible Mr X square when the net is tight.
  if (beliefSet.has(move.to)) score -= belief.length <= 8 ? 4 : 1

  // Spread out: avoid clustering with other detectives.
  let crowding = 0
  state.detectives.forEach((d, i) => {
    if (i === selfIndex) return
    const dd = distance(move.to, d.position)
    if (dd <= 2) crowding += 2 - dd
  })
  score += crowding * 0.4

  return score
}

/** Choose a move for the detective whose turn it currently is. */
export function chooseDetectiveMove(state: GameState, difficulty: Difficulty): Move {
  const idx = state.currentDetective
  const moves = detectiveLegalMoves(state, idx)
  if (moves.length === 0) throw new Error('No legal detective move')

  if (difficulty === 'easy' && Math.random() < 0.45) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const beliefSet = computeBelief(state)
  const belief = [...beliefSet]

  const scored = moves
    .map((m) => ({ m, s: scoreMove(state, m, belief, beliefSet, idx) }))
    .sort((a, b) => a.s - b.s)

  if (difficulty === 'normal' && Math.random() < 0.15) {
    const top = scored.slice(0, Math.min(3, scored.length))
    return top[Math.floor(Math.random() * top.length)].m
  }

  const best = scored[0].s
  const ties = scored.filter((x) => x.s <= best + 0.001)
  return ties[Math.floor(Math.random() * ties.length)].m
}

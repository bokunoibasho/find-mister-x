import { describe, expect, it } from 'vitest'
import { computeBelief } from './ai/belief'
import { board, distancesFrom, neighborsByTransport } from './board'
import { createGame, detectiveTakeMove, mrxTakeMove } from './engine'
import { detectiveLegalMoves, isRevealRound, mrxLegalMoves } from './rules'
import type { GameState } from './types'

function freshGame(): GameState {
  return createGame({ playerRole: 'detective', detectiveCount: 3, difficulty: 'normal' })
}

/** Move every detective far away from `keepClear` stations so they don't interfere. */
function parkDetectives(state: GameState, keepClear: number[]): void {
  const used = new Set(keepClear)
  let id = board.nodes.length
  for (const d of state.detectives) {
    while (used.has(id)) id--
    d.position = id
    used.add(id)
    id--
  }
}

describe('board', () => {
  it('is fully connected', () => {
    const dist = distancesFrom(1)
    for (const n of board.nodes) expect(dist[n.id]).toBeGreaterThanOrEqual(0)
  })

  it('has the expected station count', () => {
    expect(board.nodes.length).toBe(199)
  })
})

describe('createGame', () => {
  it('places Mr X and detectives on distinct stations', () => {
    const g = freshGame()
    expect(g.detectives).toHaveLength(3)
    const positions = [g.mrx.position, ...g.detectives.map((d) => d.position)]
    expect(new Set(positions).size).toBe(positions.length)
    expect(g.phase).toBe('mrx')
    expect(g.round).toBe(0)
  })
})

describe('reveal rounds', () => {
  it('matches the classic schedule', () => {
    expect(isRevealRound(3)).toBe(true)
    expect(isRevealRound(8)).toBe(true)
    expect(isRevealRound(4)).toBe(false)
  })
})

describe('mrxTakeMove', () => {
  it('advances the round, spends a ticket, logs, and hands over to detectives', () => {
    const g = freshGame()
    g.mrx.position = 1
    const taxiNeighbor = neighborsByTransport(1, 'taxi')[0]
    parkDetectives(g, [1, taxiNeighbor])
    const next = mrxTakeMove(g, { to: taxiNeighbor, ticket: 'taxi' })
    expect(next.round).toBe(1)
    expect(next.mrx.position).toBe(taxiNeighbor)
    expect(next.log).toHaveLength(1)
    expect(next.phase).toBe('detectives')
  })
})

describe('detectiveTakeMove', () => {
  it('wins immediately when landing on Mr X', () => {
    const g = freshGame()
    g.mrx.position = 1
    const taxiNeighbor = neighborsByTransport(1, 'taxi')[0]
    parkDetectives(g, [1, taxiNeighbor])
    g.detectives[0].position = taxiNeighbor
    g.phase = 'detectives'
    g.currentDetective = 0
    const next = detectiveTakeMove(g, { to: 1, ticket: 'taxi' })
    expect(next.phase).toBe('detective-win')
  })
})

describe('legal moves', () => {
  it('detectives cannot use transports they have no tickets for', () => {
    const g = freshGame()
    g.detectives[0].position = 1
    g.detectives[0].tickets = { taxi: 0, bus: 0, underground: 0 }
    expect(detectiveLegalMoves(g, 0)).toHaveLength(0)
  })

  it('Mr X cannot move onto a detective', () => {
    const g = freshGame()
    g.mrx.position = 1
    const taxiNeighbor = neighborsByTransport(1, 'taxi')[0]
    parkDetectives(g, [1])
    g.detectives[0].position = taxiNeighbor
    const moves = mrxLegalMoves(g)
    expect(moves.some((m) => m.to === taxiNeighbor)).toBe(false)
  })
})

describe('belief', () => {
  it('collapses to the revealed station on reveal rounds', () => {
    const g = freshGame()
    parkDetectives(g, [42])
    g.log = [{ round: 3, ticket: 'taxi', revealed: 42 }]
    const belief = computeBelief(g)
    expect([...belief]).toEqual([42])
  })

  it('expands along the ticket type used after a reveal', () => {
    const g = freshGame()
    parkDetectives(g, [42])
    const taxiNeighbors = neighborsByTransport(42, 'taxi')
    g.log = [
      { round: 3, ticket: 'taxi', revealed: 42 },
      { round: 4, ticket: 'taxi', revealed: null }
    ]
    const belief = computeBelief(g)
    for (const n of taxiNeighbors) {
      if (!g.detectives.some((d) => d.position === n)) expect(belief.has(n)).toBe(true)
    }
  })
})

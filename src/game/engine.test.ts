import { describe, expect, it } from 'vitest'
import { computeBelief } from './ai/belief'
import { board, distancesFrom, neighborsByTransport, setActiveBoard, STATION_COUNT } from './board'
import { createGame, detectiveTakeMove, mrxTakeMove } from './engine'
import { buildReveals, MODE_PRESETS } from './presets'
import { detectiveLegalMoves, isRevealRound, mrxLegalMoves, nextHiddenRound, nextRevealRound } from './rules'
import type { GameState } from './types'

function classicGame(): GameState {
  return createGame({ playerRole: 'detective', detectiveCount: 3, difficulty: 'normal', mode: 'classic' })
}

/** Move every detective far from `keepClear` stations so they don't interfere. */
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

describe('boards', () => {
  it('classic is fully connected with 199 stations', () => {
    setActiveBoard('classic')
    expect(board.nodes.length).toBe(199)
    const dist = distancesFrom(1)
    for (const n of board.nodes) expect(dist[n.id]).toBeGreaterThanOrEqual(0)
  })

  it('beginner is connected, ~45 stations, taxi+bus only', () => {
    setActiveBoard('beginner')
    expect(board.nodes.length).toBeGreaterThanOrEqual(40)
    expect(board.nodes.length).toBeLessThanOrEqual(50)
    expect(board.meta.counts.underground).toBe(0)
    expect(board.meta.river).toBeTruthy()
    const dist = distancesFrom(1)
    for (const n of board.nodes) expect(dist[n.id]).toBeGreaterThanOrEqual(0)
  })
})

describe('reveal helpers', () => {
  it('classic schedule', () => {
    expect(isRevealRound([3, 8, 13, 18, 24], 3)).toBe(true)
    expect(isRevealRound([3, 8, 13, 18, 24], 4)).toBe(false)
    expect(nextRevealRound([3, 8, 13, 18, 24], 3)).toBe(8)
  })

  it('beginner detective view is mostly visible, hidden on 3/8/13', () => {
    const reveals = buildReveals(MODE_PRESETS.beginner, 'detective')
    expect(reveals).toContain(2)
    expect(reveals).not.toContain(3)
    expect(reveals).not.toContain(8)
    expect(nextHiddenRound(reveals, 13, 1)).toBe(3)
  })
})

describe('createGame', () => {
  it('places Mr X and detectives on distinct stations', () => {
    const g = classicGame()
    expect(g.detectives).toHaveLength(3)
    const positions = [g.mrx.position, ...g.detectives.map((d) => d.position)]
    expect(new Set(positions).size).toBe(positions.length)
    expect(g.phase).toBe('mrx')
    expect(g.round).toBe(0)
  })
})

describe('mrxTakeMove', () => {
  it('advances the round, spends a ticket, logs, and hands over to detectives', () => {
    const g = classicGame()
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
    const g = classicGame()
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
    const g = classicGame()
    g.detectives[0].position = 1
    g.detectives[0].tickets = { taxi: 0, bus: 0, underground: 0 }
    expect(detectiveLegalMoves(g, 0)).toHaveLength(0)
  })

  it('Mr X cannot move onto a detective', () => {
    const g = classicGame()
    g.mrx.position = 1
    const taxiNeighbor = neighborsByTransport(1, 'taxi')[0]
    parkDetectives(g, [1])
    g.detectives[0].position = taxiNeighbor
    expect(mrxLegalMoves(g).some((m) => m.to === taxiNeighbor)).toBe(false)
  })
})

describe('belief', () => {
  it('collapses to the revealed station on reveal rounds', () => {
    const g = classicGame()
    parkDetectives(g, [42])
    g.log = [{ round: 3, ticket: 'taxi', revealed: 42 }]
    expect([...computeBelief(g)]).toEqual([42])
  })

  it('expands along the ticket type used after a reveal', () => {
    const g = classicGame()
    parkDetectives(g, [42])
    g.log = [
      { round: 3, ticket: 'taxi', revealed: 42 },
      { round: 4, ticket: 'taxi', revealed: null }
    ]
    const belief = computeBelief(g)
    for (const nb of neighborsByTransport(42, 'taxi')) {
      if (!g.detectives.some((d) => d.position === nb)) expect(belief.has(nb)).toBe(true)
    }
  })
})

describe('beginner mode', () => {
  it('uses the beginner board and short ruleset', () => {
    const g = createGame({ playerRole: 'detective', detectiveCount: 3, difficulty: 'easy', mode: 'beginner' })
    expect(STATION_COUNT).toBeLessThanOrEqual(50)
    expect(g.totalRounds).toBe(13)
    expect(g.mrx.tickets.black).toBe(1)
    expect(g.mrx.doubleRemaining).toBe(1)
    expect(g.mrxMostlyVisible).toBe(true)
    expect(g.reveals).toContain(2)
    expect(g.reveals).not.toContain(3)
  })

  it('mr x role keeps him hidden most of the time', () => {
    const g = createGame({ playerRole: 'mrx', detectiveCount: 3, difficulty: 'easy', mode: 'beginner' })
    expect(g.mrxMostlyVisible).toBe(false)
    expect(g.reveals).toEqual([3, 8, 13])
  })
})

import { STATION_COUNT, setActiveBoard } from './board'
import { MODE_PRESETS, buildReveals, mrxMostlyVisible } from './presets'
import { DETECTIVE_PALETTE, anyDetectiveCanMove, detectiveLegalMoves, mrxCanMove } from './rules'
import type { Detective, GameConfig, GameState, Move } from './types'

const clone = <T>(v: T): T => structuredClone(v)

function pickStartPositions(count: number): number[] {
  const chosen = new Set<number>()
  while (chosen.size < count) {
    chosen.add(1 + Math.floor(Math.random() * STATION_COUNT))
  }
  return [...chosen]
}

export function createGame(config: GameConfig): GameState {
  const preset = MODE_PRESETS[config.mode]
  setActiveBoard(preset.mapId)
  const count = Math.min(config.detectiveCount, preset.maxDetectives)
  const positions = pickStartPositions(count + 1)
  const mrxPos = positions[0]
  const detectives: Detective[] = []
  for (let i = 0; i < count; i++) {
    const p = DETECTIVE_PALETTE[i]
    detectives.push({
      id: i,
      name: p.name,
      color: p.color,
      position: positions[i + 1],
      tickets: { ...preset.detectiveTickets }
    })
  }
  return {
    config,
    phase: 'mrx',
    round: 0,
    totalRounds: preset.totalRounds,
    reveals: buildReveals(preset, config.playerRole),
    mrx: {
      position: mrxPos,
      tickets: { ...preset.mrxTickets },
      doubleRemaining: preset.mrxDoubleMoves,
      lastRevealed: null
    },
    detectives,
    currentDetective: 0,
    log: [],
    doubleInProgress: false,
    mrxMostlyVisible: mrxMostlyVisible(preset, config.playerRole)
  }
}

export function canUseDouble(state: GameState): boolean {
  return (
    state.phase === 'mrx' &&
    state.mrx.doubleRemaining > 0 &&
    !state.doubleInProgress &&
    state.round + 2 <= state.totalRounds
  )
}

function firstMovableDetective(state: GameState, from: number): number {
  for (let i = from; i < state.detectives.length; i++) {
    if (detectiveLegalMoves(state, i).length > 0) return i
  }
  return -1
}

function enterDetectivePhase(state: GameState): void {
  if (!anyDetectiveCanMove(state)) {
    state.phase = 'mrx-win'
    return
  }
  state.phase = 'detectives'
  state.currentDetective = firstMovableDetective(state, 0)
}

function enterMrxPhase(state: GameState): void {
  if (!mrxCanMove(state)) {
    state.phase = 'detective-win'
    return
  }
  state.phase = 'mrx'
  state.currentDetective = 0
}

/** Apply one Mr X move leg. `useDouble` requests a double move (only on first leg). */
export function mrxTakeMove(state: GameState, move: Move, useDouble = false): GameState {
  const s = clone(state)
  const startingDouble = useDouble && !s.doubleInProgress
  if (startingDouble) {
    s.mrx.doubleRemaining -= 1
    s.doubleInProgress = true
  }

  s.round += 1
  if (move.ticket === 'black') s.mrx.tickets.black -= 1
  else s.mrx.tickets[move.ticket] -= 1
  s.mrx.position = move.to

  const reveal = s.reveals.includes(s.round)
  if (reveal) s.mrx.lastRevealed = move.to
  s.log.push({ round: s.round, ticket: move.ticket, revealed: reveal ? move.to : null })

  const wasSecondLeg = state.doubleInProgress
  if (startingDouble) {
    // stay in Mr X phase for the second leg
    return s
  }
  if (wasSecondLeg) s.doubleInProgress = false
  enterDetectivePhase(s)
  return s
}

function advanceDetective(state: GameState): void {
  const next = firstMovableDetective(state, state.currentDetective + 1)
  if (next !== -1) {
    state.currentDetective = next
    return
  }
  if (state.round >= state.totalRounds) {
    state.phase = 'mrx-win'
    return
  }
  enterMrxPhase(state)
}

/** Apply a move for the detective whose turn it currently is. */
export function detectiveTakeMove(state: GameState, move: Move): GameState {
  const s = clone(state)
  const det = s.detectives[s.currentDetective]
  if (move.ticket === 'black') throw new Error('Detectives cannot use black tickets')
  det.tickets[move.ticket] -= 1
  det.position = move.to
  if (move.to === s.mrx.position) {
    s.phase = 'detective-win'
    return s
  }
  advanceDetective(s)
  return s
}

export function isGameOver(state: GameState): boolean {
  return state.phase === 'detective-win' || state.phase === 'mrx-win'
}

/** Whose move is it: 'mrx', a detective index, or null when the game is over. */
export function activeActor(state: GameState): { kind: 'mrx' } | { kind: 'detective'; index: number } | null {
  if (state.phase === 'mrx') return { kind: 'mrx' }
  if (state.phase === 'detectives') return { kind: 'detective', index: state.currentDetective }
  return null
}

import { detectiveLegalMoves, mrxLegalMoves } from './rules'
import type { GameState, Move } from './types'

export function isPlayerTurn(state: GameState): boolean {
  if (state.phase === 'mrx') return state.config.playerRole === 'mrx'
  if (state.phase === 'detectives') return state.config.playerRole === 'detective'
  return false
}

export function playerLegalMoves(state: GameState): Move[] {
  if (state.phase === 'mrx' && state.config.playerRole === 'mrx') return mrxLegalMoves(state)
  if (state.phase === 'detectives' && state.config.playerRole === 'detective')
    return detectiveLegalMoves(state, state.currentDetective)
  return []
}

export function movesTo(state: GameState, station: number): Move[] {
  return playerLegalMoves(state).filter((m) => m.to === station)
}

import { board, neighborsByTransport, neighborsWithTypes } from '../board'
import type { GameState } from '../types'

const ALL_STATIONS = board.nodes.map((n) => n.id)

/**
 * Possible Mr X locations given his public travel log + reveals, from the
 * detectives' point of view. Starts from "anywhere", expands along the ticket
 * type used each turn, and collapses to the exact station on reveal rounds.
 */
export function computeBelief(state: GameState): Set<number> {
  let possible = new Set<number>(ALL_STATIONS)
  for (const entry of state.log) {
    if (entry.revealed != null) {
      possible = new Set<number>([entry.revealed])
      continue
    }
    const next = new Set<number>()
    for (const p of possible) {
      const reachable =
        entry.ticket === 'black'
          ? neighborsWithTypes(p).map((x) => x.to)
          : neighborsByTransport(p, entry.ticket)
      for (const to of reachable) next.add(to)
    }
    possible = next
  }
  // Mr X cannot be standing on a detective (he'd be caught / wouldn't move there).
  for (const d of state.detectives) possible.delete(d.position)
  if (possible.size === 0) {
    possible = new Set<number>(ALL_STATIONS)
    for (const d of state.detectives) possible.delete(d.position)
  }
  return possible
}

import beginnerBoard from '../data/board.beginner.json'
import classicBoard from '../data/board.classic.json'
import type { EdgeType, Transport } from './types'

export type MapId = 'classic' | 'beginner'

export interface BoardNode {
  id: number
  x: number
  y: number
  kinds: string[]
}

export interface BoardEdge {
  a: number
  b: number
  type: EdgeType
}

export interface River {
  points: [number, number][]
  width: number
}

export interface BoardData {
  meta: {
    id?: string
    width: number
    height: number
    seed: number
    stations: number
    counts: Record<string, number>
    river?: River
  }
  nodes: BoardNode[]
  edges: BoardEdge[]
  adjacency: Record<string, Record<EdgeType, number[]>>
}

const BOARDS: Record<MapId, BoardData> = {
  classic: classicBoard as unknown as BoardData,
  beginner: beginnerBoard as unknown as BoardData
}

// Active board is a live binding: importers (`import { board } ...`) see updates
// after `setActiveBoard`. Default is the beginner map.
export let board: BoardData = BOARDS.beginner
export let STATION_COUNT = board.nodes.length

let nodeById = new Map<number, BoardNode>()
let distanceCache = new Map<number, Int16Array>()

function rebuild(): void {
  STATION_COUNT = board.nodes.length
  nodeById = new Map()
  for (const n of board.nodes) nodeById.set(n.id, n)
  distanceCache = new Map()
}
rebuild()

export function setActiveBoard(id: MapId): void {
  if (board === BOARDS[id]) return
  board = BOARDS[id]
  rebuild()
}

export function activeMapId(): MapId {
  return board === BOARDS.beginner ? 'beginner' : 'classic'
}

export function getNode(id: number): BoardNode {
  const n = nodeById.get(id)
  if (!n) throw new Error(`Unknown station ${id}`)
  return n
}

export function allStationIds(): number[] {
  return board.nodes.map((n) => n.id)
}

export function neighborsByTransport(id: number, transport: Transport): number[] {
  return board.adjacency[String(id)]?.[transport] ?? []
}

export function ferryNeighbors(id: number): number[] {
  return board.adjacency[String(id)]?.ferry ?? []
}

/** All neighbours reachable by any transport (deduped) with the edge types available. */
export function neighborsWithTypes(id: number): { to: number; types: EdgeType[] }[] {
  const adj = board.adjacency[String(id)]
  if (!adj) return []
  const map = new Map<number, Set<EdgeType>>()
  ;(['taxi', 'bus', 'underground', 'ferry'] as EdgeType[]).forEach((t) => {
    for (const to of adj[t]) {
      if (!map.has(to)) map.set(to, new Set())
      map.get(to)!.add(t)
    }
  })
  return [...map.entries()].map(([to, types]) => ({ to, types: [...types] }))
}

/** BFS hop-distance from `source` to every station (any transport = 1 hop). */
export function distancesFrom(source: number): Int16Array {
  const cached = distanceCache.get(source)
  if (cached) return cached
  const dist = new Int16Array(STATION_COUNT + 1).fill(-1)
  dist[source] = 0
  const queue = [source]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    for (const { to } of neighborsWithTypes(cur)) {
      if (dist[to] === -1) {
        dist[to] = dist[cur] + 1
        queue.push(to)
      }
    }
  }
  distanceCache.set(source, dist)
  return dist
}

export function distance(a: number, b: number): number {
  return distancesFrom(a)[b]
}

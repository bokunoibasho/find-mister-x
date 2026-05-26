/**
 * Deterministic generator for the game boards.
 * Outputs two maps consumed at runtime (d3-delaunay stays a dev-only dep):
 *   - board.classic.json   : ~199 stations, taxi/bus/underground/ferry
 *   - board.beginner.json  : ~45 stations, taxi/bus only, built around a river
 *
 * Run: npm run gen:board
 */
import { Delaunay } from 'd3-delaunay'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Pt = [number, number]
type EdgeType = 'taxi' | 'bus' | 'underground' | 'ferry'

interface River {
  baseY: number
  amplitude: number
  waves: number
  phase: number
  width: number
  buffer: number
  bridges: number
}

interface MapParams {
  id: string
  seed: number
  width: number
  height: number
  margin: number
  cols: number
  rows: number
  target: number
  busStops: number
  undergroundStations: number
  ferry: boolean
  river?: River
}

function mulberry32(seed: number) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const distSq = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
const dist = (a: Pt, b: Pt) => Math.sqrt(distSq(a, b))

class DSU {
  parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return false
    this.parent[ra] = rb
    return true
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function generate(p: MapParams) {
  const rng = mulberry32(p.seed)
  const { width: W, height: H, margin } = p

  const riverY = (x: number): number => {
    if (!p.river) return -1
    const t = (x - margin) / (W - 2 * margin)
    return p.river.baseY + p.river.amplitude * Math.sin(t * Math.PI * p.river.waves + p.river.phase)
  }
  const bridgeXs: number[] = []
  if (p.river) {
    for (let i = 0; i < p.river.bridges; i++) {
      bridgeXs.push(margin + ((i + 1) / (p.river.bridges + 1)) * (W - 2 * margin))
    }
  }

  // 1. Place stations on a jittered grid, pushing any that land in the river to a bank.
  const pts: Pt[] = []
  const usableW = W - 2 * margin
  const usableH = H - 2 * margin
  const cw = usableW / p.cols
  const ch = usableH / p.rows
  for (let j = 0; j < p.rows; j++) {
    for (let i = 0; i < p.cols; i++) {
      let x = Math.round(margin + (i + 0.5) * cw + (rng() - 0.5) * cw * 0.8)
      let y = Math.round(margin + (j + 0.5) * ch + (rng() - 0.5) * ch * 0.8)
      if (p.river) {
        const ry = riverY(x)
        const half = p.river.width / 2 + p.river.buffer
        if (Math.abs(y - ry) < half) {
          y = j < p.rows / 2 ? Math.round(ry - half) : Math.round(ry + half)
          y = Math.max(margin, Math.min(H - margin, y))
        }
      }
      pts.push([x, y])
    }
  }
  while (pts.length > p.target) pts.splice(Math.floor(rng() * pts.length), 1)
  const n = pts.length

  const bank = (i: number): number => (p.river ? (pts[i][1] < riverY(pts[i][0]) ? 0 : 1) : 0)
  const crosses = (a: number, b: number): boolean => p.river != null && bank(a) !== bank(b)
  const bridgeAllowed = (a: number, b: number): boolean => {
    if (!p.river) return true
    const midX = (pts[a][0] + pts[b][0]) / 2
    const tol = ((W - 2 * margin) / (p.river.bridges + 1)) * 0.45
    return bridgeXs.some((bx) => Math.abs(midX - bx) < tol)
  }

  // 2. Taxi layer.
  const taxi: [number, number][] = []
  const taxiSeen = new Set<string>()
  const addTaxi = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (taxiSeen.has(key)) return
    taxiSeen.add(key)
    taxi.push(a < b ? [a, b] : [b, a])
  }
  const dsu = new DSU(n)

  // Forced bridge crossings: nearest north/south pair around each bridge x.
  if (p.river) {
    for (const bx of bridgeXs) {
      const target: Pt = [bx, riverY(bx)]
      let north = -1
      let south = -1
      let nd = Infinity
      let sd = Infinity
      for (let i = 0; i < n; i++) {
        const d = distSq(pts[i], target)
        if (bank(i) === 0 && d < nd) {
          nd = d
          north = i
        } else if (bank(i) === 1 && d < sd) {
          sd = d
          south = i
        }
      }
      if (north >= 0 && south >= 0) {
        addTaxi(north, south)
        dsu.union(north, south)
      }
    }
  }

  // Delaunay base, dropping non-bridge river crossings and overly long edges
  // (but always keeping edges needed for connectivity).
  const d = Delaunay.from(pts)
  const rawEdges: [number, number][] = []
  const rawSeen = new Set<string>()
  const tri = d.triangles
  for (let t = 0; t < tri.length; t += 3) {
    const v = [tri[t], tri[t + 1], tri[t + 2]]
    for (let k = 0; k < 3; k++) {
      const a = v[k]
      const b = v[(k + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (!rawSeen.has(key)) {
        rawSeen.add(key)
        rawEdges.push([a, b])
      }
    }
  }
  const allowed = rawEdges.filter((e) => !crosses(e[0], e[1]) || bridgeAllowed(e[0], e[1]))
  const lengths = allowed.map((e) => dist(pts[e[0]], pts[e[1]]))
  const threshold = median(lengths) * 1.55
  const order = allowed
    .map((e, i) => ({ e, d: lengths[i] }))
    .sort((x, y) => x.d - y.d)
  for (const { e, dd = 0 } of order.map((o) => ({ e: o.e, dd: o.d }))) {
    if (dd <= threshold || dsu.find(e[0]) !== dsu.find(e[1])) {
      addTaxi(e[0], e[1])
      dsu.union(e[0], e[1])
    }
  }

  // 3. Bus layer (farthest-point stops, nearest-k links, river-aware).
  const busStops = farthestPoints(pts, p.busStops, rng)
  const bus = connectSubset(pts, busStops, 3, crosses, bridgeAllowed)

  // 4. Underground layer (classic only).
  const underground = p.undergroundStations
    ? connectSubset(pts, farthestPoints(pts, p.undergroundStations, rng), 3, () => false, () => true)
    : []

  // 5. Ferry (classic only).
  const ferry: [number, number][] = []
  if (p.ferry) {
    const band = pts
      .map((pt, i) => ({ i, pt }))
      .filter((o) => o.pt[1] > H * 0.4 && o.pt[1] < H * 0.6)
      .sort((a, b) => a.pt[0] - b.pt[0])
    const nodes: number[] = []
    const step = Math.max(1, Math.floor(band.length / 5))
    for (let i = 0; i < band.length && nodes.length < 5; i += step) nodes.push(band[i].i)
    for (let i = 0; i + 1 < nodes.length; i++) ferry.push([nodes[i], nodes[i + 1]])
  }

  // --- Assemble -----------------------------------------------------------
  const idOf = (i: number) => i + 1
  const adjacency: Record<number, Record<EdgeType, number[]>> = {}
  for (let i = 0; i < n; i++) adjacency[idOf(i)] = { taxi: [], bus: [], underground: [], ferry: [] }
  const edges: { a: number; b: number; type: EdgeType }[] = []
  const push = (list: [number, number][], type: EdgeType) => {
    for (const [a, b] of list) {
      const A = idOf(a)
      const B = idOf(b)
      edges.push({ a: A, b: B, type })
      adjacency[A][type].push(B)
      adjacency[B][type].push(A)
    }
  }
  push(taxi, 'taxi')
  push(bus, 'bus')
  push(underground, 'underground')
  push(ferry, 'ferry')

  const nodes = pts.map((pt, i) => {
    const id = idOf(i)
    const kinds: string[] = ['taxi']
    if (adjacency[id].bus.length) kinds.push('bus')
    if (adjacency[id].underground.length) kinds.push('underground')
    if (adjacency[id].ferry.length) kinds.push('ferry')
    return { id, x: pt[0], y: pt[1], kinds }
  })

  // connectivity sanity
  const all = new DSU(n)
  for (const e of edges) all.union(e.a - 1, e.b - 1)
  const roots = new Set<number>()
  for (let i = 0; i < n; i++) roots.add(all.find(i))
  if (roots.size !== 1) throw new Error(`${p.id}: board not connected (${roots.size} components)`)

  let riverMeta: { points: Pt[]; width: number } | undefined
  if (p.river) {
    const points: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const x = margin + (i / 24) * (W - 2 * margin)
      points.push([Math.round(x), Math.round(riverY(x))])
    }
    riverMeta = { points, width: p.river.width }
  } else {
    // decorative river along the ferry band for the classic map
    const y = Math.round(H * 0.5)
    riverMeta = {
      points: [
        [margin, y],
        [Math.round(W * 0.35), Math.round(y - H * 0.03)],
        [Math.round(W * 0.65), Math.round(y + H * 0.03)],
        [W - margin, y]
      ],
      width: 46
    }
  }

  return {
    meta: {
      id: p.id,
      width: W,
      height: H,
      seed: p.seed,
      stations: n,
      counts: {
        taxi: taxi.length,
        bus: bus.length,
        underground: underground.length,
        ferry: ferry.length
      },
      river: riverMeta
    },
    nodes,
    edges,
    adjacency
  }
}

function farthestPoints(pts: Pt[], k: number, rng: () => number): number[] {
  const start = Math.floor(rng() * pts.length)
  const chosen = [start]
  const best = pts.map((q) => distSq(q, pts[start]))
  while (chosen.length < k) {
    let bi = -1
    let bd = -1
    for (let i = 0; i < pts.length; i++) {
      if (best[i] > bd) {
        bd = best[i]
        bi = i
      }
    }
    chosen.push(bi)
    for (let i = 0; i < pts.length; i++) {
      const dd = distSq(pts[i], pts[bi])
      if (dd < best[i]) best[i] = dd
    }
  }
  return chosen
}

function connectSubset(
  pts: Pt[],
  subset: number[],
  nearest: number,
  crosses: (a: number, b: number) => boolean,
  bridgeAllowed: (a: number, b: number) => boolean
): [number, number][] {
  const result: [number, number][] = []
  const seen = new Set<string>()
  const add = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(a < b ? [a, b] : [b, a])
  }
  const ok = (a: number, b: number) => !crosses(a, b) || bridgeAllowed(a, b)

  for (const a of subset) {
    const others = subset
      .filter((b) => b !== a && ok(a, b))
      .map((b) => ({ b, d: distSq(pts[a], pts[b]) }))
      .sort((x, y) => x.d - y.d)
    for (let i = 0; i < Math.min(nearest, others.length); i++) add(a, others[i].b)
  }
  const idx = new Map(subset.map((node, i) => [node, i]))
  const dsu = new DSU(subset.length)
  for (const [a, b] of result) dsu.union(idx.get(a)!, idx.get(b)!)
  const candidates: { a: number; b: number; d: number }[] = []
  for (let i = 0; i < subset.length; i++)
    for (let j = i + 1; j < subset.length; j++)
      if (ok(subset[i], subset[j]))
        candidates.push({ a: subset[i], b: subset[j], d: distSq(pts[subset[i]], pts[subset[j]]) })
  candidates.sort((x, y) => x.d - y.d)
  for (const c of candidates) if (dsu.union(idx.get(c.a)!, idx.get(c.b)!)) add(c.a, c.b)
  return result
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')
mkdirSync(dataDir, { recursive: true })

const classic = generate({
  id: 'classic',
  seed: 20260525,
  width: 1000,
  height: 1400,
  margin: 70,
  cols: 12,
  rows: 17,
  target: 199,
  busStops: 72,
  undergroundStations: 13,
  ferry: true
})

const beginner = generate({
  id: 'beginner',
  seed: 77001,
  width: 1000,
  height: 1180,
  margin: 90,
  cols: 7,
  rows: 8,
  target: 45,
  busStops: 16,
  undergroundStations: 0,
  ferry: false,
  river: { baseY: 590, amplitude: 70, waves: 1.1, phase: 0.6, width: 90, buffer: 26, bridges: 3 }
})

writeFileSync(resolve(dataDir, 'board.classic.json'), JSON.stringify(classic))
writeFileSync(resolve(dataDir, 'board.beginner.json'), JSON.stringify(beginner))
console.log(
  `classic: ${classic.meta.stations} stations`,
  classic.meta.counts,
  `\nbeginner: ${beginner.meta.stations} stations`,
  beginner.meta.counts
)

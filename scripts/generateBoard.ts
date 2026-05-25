/**
 * Deterministic generator for an original "London-style" Scotland Yard board.
 * Produces ~199 stations with three transport layers (taxi/bus/underground)
 * plus a few black-ticket-only ferry routes. Output is committed to
 * src/data/board.json and consumed at runtime; d3-delaunay stays a dev-only dep.
 *
 * Run: npm run gen:board
 */
import { Delaunay } from 'd3-delaunay'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Pt = [number, number]
type EdgeType = 'taxi' | 'bus' | 'underground' | 'ferry'

const SEED = 20260525
const W = 1000
const H = 1400
const MARGIN = 70
const COLS = 12
const ROWS = 17
const TARGET = 199
const BUS_STOPS = 72
const UNDERGROUND_STATIONS = 13

function mulberry32(seed: number) {
  let s = seed >>> 0
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(SEED)
const distSq = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
const dist = (a: Pt, b: Pt) => Math.sqrt(distSq(a, b))

// --- Union-Find ---------------------------------------------------------
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

// --- 1. Place stations on a jittered grid -------------------------------
function placePoints(): Pt[] {
  const pts: Pt[] = []
  const usableW = W - 2 * MARGIN
  const usableH = H - 2 * MARGIN
  const cw = usableW / COLS
  const ch = usableH / ROWS
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const jx = (rng() - 0.5) * cw * 0.85
      const jy = (rng() - 0.5) * ch * 0.85
      const x = MARGIN + (i + 0.5) * cw + jx
      const y = MARGIN + (j + 0.5) * ch + jy
      pts.push([Math.round(x), Math.round(y)])
    }
  }
  // Drop random points down to TARGET.
  while (pts.length > TARGET) {
    pts.splice(Math.floor(rng() * pts.length), 1)
  }
  return pts
}

// --- Delaunay unique edges ---------------------------------------------
function delaunayEdges(pts: Pt[]): [number, number][] {
  const d = Delaunay.from(pts)
  const seen = new Set<string>()
  const edges: [number, number][] = []
  const { triangles } = d
  for (let t = 0; t < triangles.length; t += 3) {
    const tri = [triangles[t], triangles[t + 1], triangles[t + 2]]
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push(a < b ? [a, b] : [b, a])
      }
    }
  }
  return edges
}

// Greedy farthest-point sampling for well-spread subsets.
function farthestPoints(pts: Pt[], k: number): number[] {
  const start = Math.floor(rng() * pts.length)
  const chosen = [start]
  const best = pts.map((p) => distSq(p, pts[start]))
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

// Connect a set of nodes: each to its `nearest` neighbours within the subset,
// then guarantee the subset is connected via a Kruskal-style fallback.
function connectSubset(pts: Pt[], subset: number[], nearest: number): [number, number][] {
  const result: [number, number][] = []
  const seen = new Set<string>()
  const add = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(a < b ? [a, b] : [b, a])
  }
  // nearest-k within subset
  for (const a of subset) {
    const others = subset
      .filter((b) => b !== a)
      .map((b) => ({ b, d: distSq(pts[a], pts[b]) }))
      .sort((x, y) => x.d - y.d)
    for (let i = 0; i < Math.min(nearest, others.length); i++) add(a, others[i].b)
  }
  // connectivity fallback
  const idx = new Map(subset.map((n, i) => [n, i]))
  const dsu = new DSU(subset.length)
  for (const [a, b] of result) dsu.union(idx.get(a)!, idx.get(b)!)
  const candidates: { a: number; b: number; d: number }[] = []
  for (let i = 0; i < subset.length; i++)
    for (let j = i + 1; j < subset.length; j++)
      candidates.push({ a: subset[i], b: subset[j], d: distSq(pts[subset[i]], pts[subset[j]]) })
  candidates.sort((x, y) => x.d - y.d)
  for (const c of candidates) {
    if (dsu.union(idx.get(c.a)!, idx.get(c.b)!)) add(c.a, c.b)
  }
  return result
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function build() {
  const pts = placePoints()
  const n = pts.length

  // 2. Taxi layer: Delaunay base, drop overly long edges but keep connectivity.
  const rawEdges = delaunayEdges(pts)
  const lengths = rawEdges.map(([a, b]) => dist(pts[a], pts[b]))
  const threshold = median(lengths) * 1.55
  const order = rawEdges
    .map((e, i) => ({ e, d: lengths[i] }))
    .sort((x, y) => x.d - y.d)
  const dsu = new DSU(n)
  const taxi: [number, number][] = []
  for (const { e, d } of order) {
    if (d <= threshold || dsu.find(e[0]) !== dsu.find(e[1])) {
      dsu.union(e[0], e[1])
      taxi.push(e)
    }
  }

  // 3. Bus layer.
  const busStops = farthestPoints(pts, BUS_STOPS)
  const bus = connectSubset(pts, busStops, 3)

  // 4. Underground layer.
  const undergroundStations = farthestPoints(pts, UNDERGROUND_STATIONS)
  const underground = connectSubset(pts, undergroundStations, 3)

  // 5. Ferry (black-ticket only) along a central "river" band.
  const band = pts
    .map((p, i) => ({ i, p }))
    .filter((o) => o.p[1] > H * 0.4 && o.p[1] < H * 0.6)
    .sort((a, b) => a.p[0] - b.p[0])
  const ferryNodes: number[] = []
  const step = Math.max(1, Math.floor(band.length / 5))
  for (let i = 0; i < band.length && ferryNodes.length < 5; i += step) ferryNodes.push(band[i].i)
  const ferry: [number, number][] = []
  for (let i = 0; i + 1 < ferryNodes.length; i++) ferry.push([ferryNodes[i], ferryNodes[i + 1]])

  // --- Assemble ---------------------------------------------------------
  const idOf = (i: number) => i + 1 // 1-based station ids
  const adjacency: Record<number, Record<EdgeType, number[]>> = {}
  for (let i = 0; i < n; i++)
    adjacency[idOf(i)] = { taxi: [], bus: [], underground: [], ferry: [] }

  const edges: { a: number; b: number; type: EdgeType }[] = []
  const pushEdges = (list: [number, number][], type: EdgeType) => {
    for (const [a, b] of list) {
      const A = idOf(a)
      const B = idOf(b)
      edges.push({ a: A, b: B, type })
      adjacency[A][type].push(B)
      adjacency[B][type].push(A)
    }
  }
  pushEdges(taxi, 'taxi')
  pushEdges(bus, 'bus')
  pushEdges(underground, 'underground')
  pushEdges(ferry, 'ferry')

  const nodes = pts.map((p, i) => {
    const id = idOf(i)
    const kinds: string[] = ['taxi']
    if (adjacency[id].bus.length) kinds.push('bus')
    if (adjacency[id].underground.length) kinds.push('underground')
    if (adjacency[id].ferry.length) kinds.push('ferry')
    return { id, x: p[0], y: p[1], kinds }
  })

  // Sanity: whole board connectivity (taxi guarantees it).
  const all = new DSU(n)
  for (const e of edges) all.union(e.a - 1, e.b - 1)
  const roots = new Set<number>()
  for (let i = 0; i < n; i++) roots.add(all.find(i))
  if (roots.size !== 1) throw new Error(`Board not fully connected: ${roots.size} components`)

  const board = {
    meta: {
      width: W,
      height: H,
      seed: SEED,
      stations: n,
      counts: {
        taxi: taxi.length,
        bus: bus.length,
        underground: underground.length,
        ferry: ferry.length
      }
    },
    nodes,
    edges,
    adjacency
  }

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const out = resolve(__dirname, '../src/data/board.json')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(board))
  console.log(
    `Board generated: ${n} stations, taxi=${taxi.length} bus=${bus.length} underground=${underground.length} ferry=${ferry.length}`
  )
  console.log(`Wrote ${out}`)
}

build()

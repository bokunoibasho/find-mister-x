/** Dev-only: rasterize a board JSON to a PNG that mirrors the in-game rendering. */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Pt = [number, number]
interface Board {
  meta: { width: number; height: number; counts: Record<string, number>; river?: { points: Pt[]; width: number } }
  nodes: { id: number; x: number; y: number; kinds: string[] }[]
  edges: { a: number; b: number; type: string }[]
}

const STYLE: Record<string, { color: string; w: number; dash?: string }> = {
  taxi: { color: '#cbd5e1', w: 1.8 },
  bus: { color: '#34d399', w: 3.2 },
  underground: { color: '#f87171', w: 4.4 },
  ferry: { color: '#38bdf8', w: 3.2, dash: '8 6' }
}
const HALO = '#0a0e1c'

function render(board: Board): string {
  const { width: W, height: H } = board.meta
  const scale = board.nodes.length < 80 ? 1.7 : 1
  const byId = new Map(board.nodes.map((n) => [n.id, n]))
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  s += `<rect width="${W}" height="${H}" fill="#0c1322"/>`

  if (board.meta.river) {
    const d = 'M ' + board.meta.river.points.map((p) => `${p[0]} ${p[1]}`).join(' L ')
    s += `<path d="${d}" fill="none" stroke="#16314f" stroke-width="${board.meta.river.width + 8}" stroke-linecap="round" stroke-linejoin="round"/>`
    s += `<path d="${d}" fill="none" stroke="#1f4c79" stroke-width="${board.meta.river.width}" stroke-linecap="round" stroke-linejoin="round"/>`
  }

  for (const type of ['taxi', 'ferry', 'bus', 'underground']) {
    const st = STYLE[type]
    for (const e of board.edges) {
      if (e.type !== type) continue
      const a = byId.get(e.a)!
      const b = byId.get(e.b)!
      if (type !== 'taxi')
        s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${HALO}" stroke-width="${st.w + 1.8}" stroke-linecap="round"/>`
      const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : ''
      s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${st.color}" stroke-width="${st.w}"${dash} stroke-linecap="round"/>`
    }
  }

  for (const n of board.nodes) {
    const r = (n.kinds.includes('underground') ? 8.5 : n.kinds.includes('bus') ? 7 : 5.5) * scale
    const stroke = n.kinds.includes('underground') ? '#ef4444' : n.kinds.includes('bus') ? '#22c55e' : '#94a3b8'
    s += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="#eef2f8" stroke="${stroke}" stroke-width="${2 * scale}"/>`
    s += `<text x="${n.x}" y="${n.y + 3 * scale}" font-size="${6.5 * scale}" font-weight="700" text-anchor="middle" fill="#1f2937">${n.id}</text>`
  }
  s += `</svg>`
  return s
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../src/data')

async function main() {
  for (const id of ['beginner', 'classic']) {
    const board = JSON.parse(readFileSync(resolve(dataDir, `board.${id}.json`), 'utf8')) as Board
    const svg = render(board)
    await sharp(Buffer.from(svg)).png().toFile(`/tmp/preview-${id}.png`)
    console.log(`/tmp/preview-${id}.png (${board.nodes.length} stations)`)
  }
}

main()
